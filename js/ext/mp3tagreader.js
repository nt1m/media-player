// Copyright (C) 2019 Mohamed H
// 
// Mp3TagReader is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// Mp3TagReader is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
// 
// You should have received a copy of the GNU Lesser General Public License
// along with Mp3TagReader. If not, see <http://www.gnu.org/licenses/>.

const getMp3Tag = (function(){


    const fileToArrayBuffer = function (blob) {
        return new Promise ((res, rej) => {
            const reader = new FileReader();
            reader.onload = function() {
                res(reader.result);
            };
            reader.onabort = function() {
                rej(reader.error);
            };
            
            reader.readAsArrayBuffer(blob);
        });
    };
    
    const bufferToString = (buf, u16=false) => String.fromCodePoint(...new (u16?Uint16Array:Uint8Array)(buf)).split('\0').join();
    
    const superBuffer = buf => {
        return {
            get buf () {return buf;},
            splice (a, b) {
                const tmp = buf.slice (a,b);
                buf = buf.slice (b)
                return superBuffer (tmp)
            }
        };
    }
    
    
    
    const getMp3Tag = async function (file) {
        if (file.type !== "audio/mpeg" && file.type !== "") return null;
        const id3v2Head = superBuffer (await fileToArrayBuffer (file.slice(0, 10)));
        const concatSize = (buf, i=8) => [...new Uint8Array (buf)].reduce ((prev, cur) =>(prev << i) + cur, 0);
        const id3v1Genre = ["Blues","Classic Rock","Country","Dance","Disco","Funk","Grunge","Hip-Hop","Jazz","Metal","New Age","Oldies","Other","Pop","R&B","Rap","Reggae","Rock","Techno","Industrial","Alternative","Ska","Death Metal","Pranks","Soundtrack","Euro-Techno","Ambient","Trip-Hop","Vocal","Jazz+Funk","Fusion","Trance","Classical","Instrumental","Acid","House","Game","Sound Clip","Gospel","Noise","AlternRock","Bass","Soul","Punk","Space","Meditative","Instrumental Pop","Instrumental Rock","Ethnic","Gothic","Darkwave","Techno-Industrial","Electronic","Pop-Folk","Eurodance","Dream","Southern Rock","Comedy","Cult","Gangsta","Top 40","Christian Rap","Pop/Funk","Jungle","Native American","Cabaret","New Wave","Psychedelic","Rave","Showtunes","Trailer","Lo-Fi","Tribal","Acid Punk","Acid Jazz","Polka","Retro","Musical","Rock & Roll","Hard Rock"];
    
    
        if (bufferToString(id3v2Head.splice(0,3).buf) !== "ID3") {
            const id3v1Tag = superBuffer (await fileToArrayBuffer (file.slice(-128)));
            
            if (bufferToString(id3v1Tag.splice(0,3).buf) !== "TAG") return null;
            return {
                id3: {
                    version: '1'
                },
                title: bufferToString (id3v1Tag.splice(0, 30).buf),
                artist: bufferToString (id3v1Tag.splice(0, 30).buf),
                year: bufferToString (id3v1Tag.splice(0, 4).buf),
                comment: bufferToString (id3v1Tag.splice(0, 30).buf),
                genre: id3v1Genre[(new Uint8Array (id3v1Tag.splice(0, 1).buf))[0]],
            }
        }
    
        const id3v2Version = [...new Uint8Array (id3v2Head.splice(0,2).buf)].join('.');
        const isv2_2 = id3v2Version[0]-0 < 3 ? 1 : 0;
        //if (isv2_2) throw new Error('id3v2 2 not implemented yet');
        const [flags] = new Uint8Array (id3v2Head.splice(0,1).buf);
        if (flags & 0b1111) return null;
        const unsynchronisation     = (flags & 0b10000000) !== 0;
        const extendedHeader        = (flags & 0b01000000) !== 0;
        const experimentalIndicator = (flags & 0b00100000) !== 0;
        const FooterPresent         = (flags & 0b00010000) !== 0;
        const size = concatSize (id3v2Head.splice(0,4).buf);
        const tag = superBuffer (await fileToArrayBuffer (file.slice(10).slice(0, size)));
        
    
        if (extendedHeader) {
            const [size] = new Uint32Array (tag.splice(0, 4).buf);
            const extHeader = tag.splice(0, size); // TODO
        }
    
        const frames = !isv2_2 ? {
            TXXX: [],
            WXXX: [],
            COMM: [],
            UFID: [],
            WCOM: [],
            WOAR: [],
            USLT: [],
            SYLT: [],
            RVA2: [],
            EQU2: [],
            GEOB: [],
            POPM: [],
            AENC: [],
            LINK: [],
            USER: [],
            COMR: [],
            SIGN: [],
        } : {
            COM: [],
            UFI: [],
            TXX: [],
            WXX: [],
            WAR: [],
            WCM: [],
            ULT: [],
            SLT: [],
            GEO: [],
            POP: [],
            CRM: [],
            CRA: [],
            LNK: [],
        };
        const add = (i,v) => !Array.isArray(frames[i])?frames[i]=v:frames[i].push(v);
        const text = data => {
            const [enc] = new Uint8Array (data.splice(0,1).buf);
            return bufferToString (data.buf, enc%3)
        }
    
        while (1) {
            const UframeId = new Uint8Array (tag.splice(0, 4 - isv2_2).buf);
            const frameId = String.fromCodePoint(...UframeId);
            if (!UframeId[0]) break;
            const size = concatSize (tag.splice(0,4 - isv2_2).buf);
            const [flags] = new Uint16Array (tag.splice(0,2 - 2 * isv2_2).buf);
            const data = tag.splice(0,size);
            if (frameId === "UFID" || frameId === "UFI") {
                const arr = new Uint8Array (data.buf);
                const i = arr.indexOf (0);
                if ( i < 0 ) throw rej ('UFID');
                add (frameId, {
                    ownerIdentifier: String.fromCharPoint(...arr.slice(0,i)),
                    identifier: arr.slice (i+1)
                });
            }
            else if (frameId[0] === "T") {
                if (frameId === "TXXX" || frameId === "TXX") { 
                    const [description, value] = text (data).split ("\u0000").filter (e => e!=="");
                    add (frameId, {description, value});
                } else add (frameId,text (data));
            }
            else if (frameId[0] === "W") {
                if (frameId === "WXXX" || frameId === "WXX") {
                    const [description, url] = text (data).split ("\u0000").filter (e => e!=="");
                    add (frameId, {description, url});
                } else add (frameId, bufferToString (data.buf));
            }
            else if (frameId  === "APIC" || frameId  === "PIC") {
                const [enc] = new Uint8Array (data.splice(0,1).buf);
                const arr = new Uint8Array (data.buf);
                let off = 0;
                let prevoff = 0;
                let type = "";
                if (!isv2_2) {
                    for (; arr[off] !== 0 && off < arr.length; off++);
                    type = bufferToString (data.splice (0, isv2_2 ? ++off : off).buf, enc%3);
                    prevoff = off++;off++;

                } else {
                    const imgType = bufferToString(data.splice (0, 3).buf);
                    type = "image/"+imgType.toLowerCase();
                    prevoff = off = 3;
                }
                for (; arr[off] !== 0 && off < arr.length; off++);
                for (; arr[off] === 0 && off < arr.length; off++);
                data.splice (0, off-prevoff);
                add (frameId, new Blob ([data.buf], {type}));
            }
            else if (frameId === "COMM" || frameId === "COM") {
                const [enc] = new Uint8Array (data.splice(0,1).buf);
                const language = bufferToString (data.splice(0,3).buf);
                const arr = new Uint8Array (data.buf);
                const [i, j] = [arr.indexOf(0), arr.length-1 - [...arr].reverse().indexOf(0)]
                const shortDescription = bufferToString (data.buf.slice(0,i), enc%3);
                const comment = bufferToString (data.buf.slice(j+1), enc%3);
                add (frameId, {
                    language, shortDescription, comment
                })
            }
            else add (frameId, new Uint8Array (data.buf));
           
        }
    
        const ret = {
            frames,
            id3: {
                version: id3v2Version,
                unsynchronisation,
                extendedHeader,
                experimentalIndicator,
                FooterPresent
            }
        }
        if (ret.frames["TIT2"]!=null) ret.title = ret.frames["TIT2"];
        if (ret.frames["TPE1"]!=null) ret.artist = ret.frames["TPE1"];
        if (ret.frames["TYER"]!=null) ret.year = ret.frames["TYER"];
        if (ret.frames["TALB"]!=null) ret.album = ret.frames["TALB"];
        if (ret.frames["TCON"]!=null) ret.genre = ret.frames["TCON"];
        if (ret.frames["TRCK"]!=null) ret.track = ret.frames["TRCK"];
        if (ret.frames["COMM"]!=null) ret.comments = ret.frames["COMM"].map(e=>e.comment);
        if (ret.frames["APIC"]!=null) ret.picture = ret.frames["APIC"];

        if (ret.frames["TT2"]!=null) ret.title = ret.frames["TT2"];
        if (ret.frames["TP1"]!=null) ret.artist = ret.frames["TP1"];
        if (ret.frames["TYE"]!=null) ret.year = ret.frames["TYE"];
        if (ret.frames["TAL"]!=null) ret.album = ret.frames["TAL"];
        if (ret.frames["TCO"]!=null) ret.genre = ret.frames["TCO"];
        if (ret.frames["TRK"]!=null) ret.track = ret.frames["TRK"];
        if (ret.frames["COM"]!=null) ret.comments = ret.frames["COM"].map(e=>e.comment);
        if (ret.frames["PIC"]!=null) ret.picture = ret.frames["PIC"];
    
        return ret;
    }
    
    return getMp3Tag;

})();
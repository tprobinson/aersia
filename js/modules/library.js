/////
// Library functions
/////

function syntaxHighlight(json) { //http://stackoverflow.com/questions/4810841/
    if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 4);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
//FUTURE: modify syntaxHighlight to step through the object and encode each piece while tying a .data() of a an object ref to the span.
//This might improve performance on full views.
//Perhaps, modify the string spans to be "<span>val</span>" rather than <span>"val"</span> //REWORK
//Keep a copy of the original with attribution.

function typeParse(value)
{
	if( value === null || value === undefined )
	{ return; }

	if( isInt(value) )
	{ return parseInt(value); }
	if( isFloat(value) )
	{ return parseFloat(value); }
	if( isBool(value) )
	{ return parseBool(value); }
	if( isJSON(value) )
	{ return JSON.parse(value); }

	return value;
}

function isInt(n) { //http://stackoverflow.com/questions/3885817/
    return n != "" && !isNaN(n) && Math.round(n) == n;
}
function isFloat(n) {
    return n != "" && !isNaN(n) && Math.round(n) != n;
}
function isBool(n) {
	return n === "true" || n === "false";
}
function isJSON(n) {
    try {
        JSON.parse(n);
    } catch (e) {
        return false;
    }
    return true;
}
function parseBool(n) {
	if( n === "true" ) { return true; }
	return false;
}

function clone(obj) { //http://stackoverflow.com/questions/728360/
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

// function lengthInUtf8Bytes(str) { //http://stackoverflow.com/questions/5515869/
//   // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
//   var m = encodeURIComponent(str).match(/%[89ABab]/g);
//   return str.length + (m ? m.length : 0);
// }

function lengthInUtf8Bytes(value) { //based on getByteLen here: http://jsperf.com/utf-8-byte-length/18
    value = String(value);

    var byteLen = 0;
    for (var i = 0; i < value.length; i++) {
        var c = value.charCodeAt(i);
        byteLen += c < (1 <<  7) ? 1 :
            c < (1 << 11) ? 2 :
            c < (1 << 16) ? 3 :
            c < (1 << 21) ? 4 :
            c < (1 << 26) ? 5 :
            c < (1 << 31) ? 6 : Number.NaN;
    }
    return byteLen;
}

function utf8Slice(str,begin,lenInBytes) {
	//try a naive slice first
	var nextSlice = lenInBytes;

	//If the slice is longer in real bytes than the target, that means that diff number of characters had a trailing UTF8 byte.
	//In the best case, slicing diff less characters will make it perfect. (e.g. if all ending characters are *not* UTF8.
	//In the worst case, slicing diff less characters will undershoot by diff bytes. (e.g. if all ending characters are UTF8.)
	do
	{
		slice = str.substring(begin,nextSlice);
		diff = lengthInUtf8Bytes(slice) - lenInBytes;

		if( diff > 0 )
		{ nextSlice = nextSlice - diff; }
	}
	while( diff > 0 );

	return { slice: slice, actualSlice: nextSlice };
}

function merge(template,tomerge) {
	return $.extend({}, template, tomerge);

}


//Garbage collection forcing
//The way this works is due to the phenomenon whereby child nodes of an object with it's innerHTML emptied are removed from memory
window.garbageBin = null;
//Here we are creating a 'garbage bin' object to temporarily store elements that are to be discarded
garbageBin = document.createElement('div');
garbageBin.style.display = 'none'; //Make sure it is not displayed
document.body.appendChild(garbageBin);

function discardElement (el)
{
	//Move the element to the garbage bin element
	garbageBin.appendChild(el);
	//Empty the garbage bin
	garbageBin.innerHTML = "";
}
function discardjQ (el)
{
	//Move the element to the garbage bin element
	garbageBin.appendChild(el[0]);
	//Empty the garbage bin
	garbageBin.innerHTML = "";
}

function cleanElement (el)
{
	el.innerHTML = "";
}
function cleanjQ(el)
{
	el[0].innerHTML = "";
}

let incTimer, scrollTimer, announcementTimeout, cryptoWorker, workerUrl, selectSearchString, selectSearchTimeout;
const cache = {};
const announcer = document.getElementById('live-announcements');
const VALID_INPUTS = /^(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?$|^(?:yes|no)$|^(?:old|new|rap)$|^(?:none|self|spouse)$|^(?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)$/i

Object.defineProperty(String.prototype, 'strToNum', {
    value: function() {
        const clean = this.replace(/[^\d.-]/g, '');
        return clean === '' ? NaN : parseFloat(clean);
    },
    enumerable: false
});

Object.defineProperty(Number.prototype, 'numToStr', {
    value: function(ref = "") {
        if (isNaN(this)) return "";
        const hasDecimal = ref.includes('.');
        const decimalsPlaces = hasDecimal ? 2 : 0; 
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalsPlaces,
            maximumFractionDigits: decimalsPlaces,
            roundingMode: 'floor'
        }).format(this);
    },
    enumerable: false
});

Object.defineProperty(Number.prototype, 'roundDecimals', {
    value: function(places) {
        const offset = Math.pow(10, places);
        return Math.round(this * offset) / offset; 
    },
    enumerable: false
});

function announce(message) {
    clearTimeout(announcementTimeout);
    announcementTimeout = setTimeout(() => {
        announcer.textContent = '';
        requestAnimationFrame(() => {
            announcer.textContent = message;
        });
    }, 50);
}

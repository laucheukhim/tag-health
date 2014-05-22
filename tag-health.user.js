// ==UserScript==
// @name             Tag Health
// @namespace        TagHealth
// @version          1.0.0
// @description      Tag Health monitors the question quality of a given set of tags on a Stack Exchange site with a sample of about 500 most recent questions.
// @include          http://*stackoverflow.com/*
// @include          https://*stackoverflow.com/*
// @include          http://*superuser.com/*
// @include          https://*superuser.com/*
// @include          http://*serverfault.com/*
// @include          https://*serverfault.com/*
// @include          http://*askubuntu.com/*
// @include          https://*askubuntu.com/*
// @include          http://*seasonedadvice.com/*
// @include          https://*seasonedadvice.com/*
// @include          http://*mathoverflow.net/*
// @include          https://*mathoverflow.net/*
// @include          http://*stackapps.com/*
// @include          https://*stackapps.com/*
// @include          http://*stackexchange.com/*
// @include          https://*stackexchange.com/*
// @author           Antony Lau
// @downloadURL      https://laucheukhim.github.io/tag-health/tag-health.user.js
// @updateURL        https://laucheukhim.github.io/tag-health/tag-health.user.js
// ==/UserScript==

function with_jquery(f) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = "(" + f.toString() + ")(jQuery)";
    document.body.appendChild(script);
}

with_jquery(function ($) {
    if (!(window.StackExchange && StackExchange.ready)) return;

    var TagHealth = {
        defaults: {
            maxItems: 500,
            maxPage: 5,
            cacheDuration: 3600,
            scriptURL: 'https://laucheukhim.github.io/tag-health/tag-health.user.js'
        },
        version: {
            number: '1.0.0',
            compare: function (number, options) {
                var lexicographical = options && options.lexicographical,
                    zeroExtend = options && options.zeroExtend,
                    v1parts = this.number.split('.'),
                    v2parts = number.split('.');
                function isValidPart(x) {
                    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
                }
                if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
                    return NaN;
                }
                if (zeroExtend) {
                    while (v1parts.length < v2parts.length) v1parts.push("0");
                    while (v2parts.length < v1parts.length) v2parts.push("0");
                }
                if (!lexicographical) {
                    v1parts = v1parts.map(Number);
                    v2parts = v2parts.map(Number);
                }
                for (var i = 0; i < v1parts.length; ++i) {
                    if (v2parts.length == i) {
                        return 1;
                    }
                    if (v1parts[i] == v2parts[i]) {
                        continue;
                    }
                    else if (v1parts[i] > v2parts[i]) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                }
                if (v1parts.length != v2parts.length) {
                    return -1;
                }
                return 0;
            },
            checkRemote: function() {
                $.getScript(TagHealth.defaults.scriptURL);
            },
            checkLocal: function() {
                if (typeof window.TagHealth === 'undefined') {
                    window.TagHealth = TagHealth;
                    return true;
                } else {
                    if (window.TagHealth.version.compare(TagHealth.version.number)) {
                        window.TagHealth.version.remind();
                    }
                    return false;
                }
            },
            remind: function() {
                $('#tag-health .update-button').show();
            }
        },
        browser: (function () {
            var isOpera = !! window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
            var isFirefox = typeof InstallTrigger !== 'undefined';
            var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
            var isChrome = !! window.chrome && !isOpera;
            var isIE = /*@cc_on!@*/false || !! document.documentMode;
            return {
                isOpera: isOpera,
                isFirefox: isFirefox,
                isSafari: isSafari,
                isChrome: isChrome,
                isIE: isIE
            };
        })(),
        helpers: {
            getStyleObject: function (element) {
                var dom = element.get(0);
                var style;
                var returns = {};
                if (window.getComputedStyle) {
                    var camelize = function (a, b) {
                        return b.toUpperCase();
                    };
                    style = window.getComputedStyle(dom, null);
                    for (var i = 0, l = style.length; i < l; i++) {
                        var prop = style[i];
                        var camel = prop.replace(/\-([a-z])/g, camelize);
                        var val = style.getPropertyValue(prop);
                        returns[camel] = val;
                    }
                    return returns;
                }
                if (style = dom.currentStyle) {
                    for (var prop in style) {
                        returns[prop] = style[prop];
                    }
                    return returns;
                }
                return element.css();
            }
        },
        data: {
            getTags: function () {
                var path = location.pathname;
                var match = path.match(/\/tagged\/(.*)/i);
                if (match && match[1]) {
                    return match[1].toLowerCase().split('+').sort();
                }
                return [];
            },
            getQuestions: function (page) {
                page = page || 1;
                var api_url = 'http://api.stackexchange.com/2.2/questions/';
                var api_param = '?pagesize=100&page=' + page + '&order=desc&sort=creation&site=' + location.host + '&tagged=' + TagHealth.data.getTags().join(';');
                var api_filter = '!OfYUOxuTWxgnJNCy5BxBp6hE.9.F1YXZN33GRCl04bC';
                var api_key = 'd7zYCJ)APyrcXJPtDJsJGQ((';
                return $.ajax({
                    type: 'GET',
                    url: api_url + api_param + '&filter=' + api_filter + '&key=' + api_key + '&callback=?',
                    dataType: 'json'
                });
            },
            getAnchorColor: function () {
                var a = $('<a></a>').appendTo('body');
                var color = window.getComputedStyle(a.get(0)).color;
                a.remove();
                return color;
            },
            getBackgroundColor: function () {
                function getElementBackgroundColor(element) {
                    if (element.length) {
                        var color = window.getComputedStyle(element.get(0)).backgroundColor;
                        if (color && $.inArray(color, ['rgba(0, 0, 0, 0)', 'transparent']) === -1) {
                            var match = null;
                            if (match = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/)) {
                                if (match[4] < 0.9) {
                                    return 'rgba(' + match[1] + ', ' + match[2] + ', ' + match[3] + ', 0.9)';
                                }
                            }
                            return color;
                        }
                    }
                    return false;
                }
                if (location.host === 'christianity.stackexchange.com') {
                    return 'rgb(255, 255, 255)';
                }
                var color;
                if (color = getElementBackgroundColor($('#sidebar'))) return color;
                if (color = getElementBackgroundColor($('#mainbar'))) return color;
                if (color = getElementBackgroundColor($('#content'))) return color;
                if (color = getElementBackgroundColor($('body'))) return color;
                if (color = getElementBackgroundColor($('html'))) return color;
                return 'rgb(255, 255, 255)';
            }
        },
        process: {
            getAllQuestions: function (callback) {
                var items = TagHealth.storage.fetchItems();

                function process(page) {
                    TagHealth.data.getQuestions(page).done(function (data) {
                        TagHealth.storage.saveItems(data.items);
                        items = TagHealth.storage.fetchItems();
                        callback(items);
                        if (data.has_more && items.length < TagHealth.defaults.maxItems && page < TagHealth.defaults.maxPage) {
                            process(page + 1);
                        }
                    });
                }
                callback(items);
                process(1);
            },
            extractDataPoints: function (items) {
                var dataPoints = [];
                for (var i = 0; i < items.length; i++) {
                    if (typeof items[i].owner.reputation !== 'undefined') {
                        dataPoints.push({
                            score: items[i].score,
                            reputation: items[i].owner.reputation,
                            title: items[i].title + (function () {
                                if (typeof items[i].closed_reason !== 'undefined') {
                                    if (items[i].closed_reason === 'duplicate') {
                                        return ' [duplicate]';
                                    } else {
                                        if (typeof items[i].closed_date === 'number') {
                                            if (items[i].closed_date > Date.now() / 1000 - 7 * 24 * 60 * 60) {
                                                return ' [on hold]';
                                            } else {
                                                return ' [closed]';
                                            }
                                        }
                                    }
                                }
                                if (typeof items[i].migrated_to !== 'undefined' && typeof items[i].migrated_to.on_date === 'number') {
                                    return ' [migrated]';
                                }
                                return '';
                            })(),
                            link: items[i].link,
                            creationDate: items[i].creation_date,
                            isAnswered: items[i].is_answered,
                            isClosed: typeof items[i].closed_reason !== 'undefined'
                        });
                    }

                }
                return dataPoints;
            },
            generatePlot: function (settings) {
                settings = $.extend({
                    logReputation: false,
                    spread: false,
                    startDate: null,
                    isAnswered: null,
                    isClosed: null
                }, settings);
                settings.startDate = (function () {
                    switch (settings.startDate) {
                        case '1 hour':
                            return parseInt(Date.now() / 1000 - 1 * 1 * 3600, 10);
                        case '6 hours':
                            return parseInt(Date.now() / 1000 - 1 * 6 * 3600, 10);
                        case '12 hours':
                            return parseInt(Date.now() / 1000 - 1 * 12 * 3600, 10);
                        case '1 day':
                            return parseInt(Date.now() / 1000 - 1 * 24 * 3600, 10);
                        case '1 week':
                            return parseInt(Date.now() / 1000 - 7 * 24 * 3600, 10);
                        case '1 month':
                            return parseInt(Date.now() / 1000 - 30 * 24 * 3600, 10);
                        case '6 months':
                            return parseInt(Date.now() / 1000 - 182.5 * 24 * 3600, 10);
                        case '1 year':
                            return parseInt(Date.now() / 1000 - 365 * 24 * 3600, 10);
                        default:
                            return null;
                    }
                })();
                settings.isAnswered = (function () {
                    switch (settings.isAnswered) {
                        case 'Answered':
                            return true;
                        case 'Unanswered':
                            return false;
                        default:
                            return null;
                    }
                })();
                settings.isClosed = (function () {
                    switch (settings.isClosed) {
                        case 'Closed':
                            return true;
                        case 'Not closed':
                            return false;
                        default:
                            return null;
                    }
                })();
                var widthRatio = $('#tag-health-plot .cell.left').outerWidth() / $('#tag-health-plot').width();
                var dataPoints = this.extractDataPoints($('#tag-health').data('items'));
                var minScore = null;
                var maxScore = null;
                var minReputation = null;
                var maxReputation = null;
                if (dataPoints.length) {
                    var i = dataPoints.length;
                    while (i--) {
                        if (settings.startDate && settings.startDate > dataPoints[i].creationDate) {
                            dataPoints.splice(i, 1);
                        } else if (settings.isAnswered === true && dataPoints[i].isAnswered === false) {
                            dataPoints.splice(i, 1);
                        } else if (settings.isAnswered === false && dataPoints[i].isAnswered === true) {
                            dataPoints.splice(i, 1);
                        } else if (settings.isClosed === true && dataPoints[i].isClosed === false) {
                            dataPoints.splice(i, 1);
                        } else if (settings.isClosed === false && dataPoints[i].isClosed === true) {
                            dataPoints.splice(i, 1);
                        }
                    }
                    for (i = 0; i < dataPoints.length; i++) {
                        if (minScore === null || dataPoints[i].score < minScore) {
                            minScore = dataPoints[i].score;
                        }
                        if (maxScore === null || dataPoints[i].score > maxScore) {
                            maxScore = dataPoints[i].score;
                        }
                        if (minReputation === null || dataPoints[i].reputation < minReputation) {
                            minReputation = dataPoints[i].reputation;
                        }
                        if (maxReputation === null || dataPoints[i].reputation > maxReputation) {
                            maxReputation = dataPoints[i].reputation;
                        }
                    }
                    if (minScore !== null && maxScore !== null) {
                        if (Math.abs(minScore) >= Math.abs(maxScore)) {
                            maxScore = Math.abs(minScore);
                        } else {
                            minScore = -Math.abs(maxScore);
                        }
                    }
                    $('#tag-health-plot .min-score').html(minScore);
                    $('#tag-health-plot .max-score').html(maxScore);
                    $('#tag-health-plot .max-reputation').html(settings.logReputation && maxReputation !== null ? (Math.log(maxReputation) / Math.log(10)).toFixed(5) : maxReputation);
                    $('#tag-health-plot .tag-health-dot').remove();
                    for (i = 0; i < dataPoints.length; i++) {
                        var dot = $('\
                            <div class="tag-health-dot">\
                                <a href="' + dataPoints[i].link + '">\
                                    <div class="cross' + (settings.spread ? ' spread' : '') + '"></div>\
                                </a>\
                            </div>\
                        ');
                        var left = (function () {
                            if (settings.logReputation) {
                                if (maxReputation === 1) {
                                    return widthRatio * 100;
                                }
                                return widthRatio * 100 + Math.log(dataPoints[i].reputation) / Math.log(maxReputation) * (1 - widthRatio) * 100;
                            } else {
                                return widthRatio * 100 + dataPoints[i].reputation / maxReputation * (1 - widthRatio) * 100;
                            }
                        })();
                        var top = (function () {
                            if (maxScore === 0) {
                                return 50;
                            }
                            if (dataPoints[i].score < 0) {
                                return 50 + Math.abs(dataPoints[i].score) / maxScore * 50;
                            } else {
                                return 50 - Math.abs(dataPoints[i].score) / maxScore * 50;
                            }
                        })();
                        dot.css({
                            left: left + '%',
                            top: top + '%'
                        });
                        dot.data({
                            score: dataPoints[i].score,
                            reputation: dataPoints[i].reputation,
                            title: dataPoints[i].title
                        });
                        $('#tag-health-plot').append(dot);
                    }
                }
            }
        },
        storage: {
            localStorageAvailable: function () {
                try {
                    return 'localStorage' in window && window['localStorage'] !== null;
                } catch (e) {
                    return false;
                }
            },
            getStorage: function (key) {
                if (this.localStorageAvailable()) {
                    try {
                        var storageString = localStorage.getItem('tag-health');
                        var storage = JSON.parse(storageString);
                        if (storage !== null && typeof storage === 'object') {
                            return storage[key];
                        }
                    } catch (e) {}
                }
            },
            setStorage: function (key, value) {
                if (this.localStorageAvailable()) {
                    var storageString = '';
                    var storage = {};
                    try {
                        storageString = localStorage.getItem('tag-health');
                        storage = JSON.parse(storageString);
                        if (storage === null || typeof storage !== 'object') {
                            storage = {};
                        }
                    } catch (e) {}
                    storage[key] = value;
                    storageString = JSON.stringify(storage);
                    localStorage.setItem('tag-health', storageString);
                }
            },
            fetchItems: function () {
                var items = [];
                var tags = TagHealth.data.getTags().join('+');
                var allItems = this.getStorage('items');
                if (typeof allItems !== 'undefined') {
                    var storedItems = allItems[tags];
                    if (Object.prototype.toString.call(storedItems) === '[object Array]') {
                        for (var i = 0; i < storedItems.length; i++) {
                            if (typeof storedItems[i].timestamp === 'number' && storedItems[i].timestamp >= Date.now() - TagHealth.defaults.cacheDuration * 1000) {
                                delete storedItems[i].timestamp;
                                items.push(storedItems[i]);
                            }
                        }
                    }
                }
                return items;
            },
            saveItems: function (items) {
                if (Object.prototype.toString.call(items) === '[object Array]') {
                    var question_ids = [];
                    for (var i = 0; i < items.length; i++) {
                        question_ids.push(items[i].question_id);
                        items[i].timestamp = Date.now();
                    }
                    var tags = TagHealth.data.getTags().join('+');
                    var allItems = this.getStorage('items');
                    if (typeof allItems !== 'undefined') {
                        var storedItems = allItems[tags];
                        if (Object.prototype.toString.call(storedItems) === '[object Array]') {
                            for (i = 0; i < storedItems.length; i++) {
                                if (typeof storedItems[i].timestamp === 'number' && storedItems[i].timestamp >= Date.now() - TagHealth.defaults.cacheDuration * 1000) {
                                    if ($.inArray(storedItems[i].question_id, question_ids) === -1) {
                                        items.push(storedItems[i]);
                                    }
                                }
                            }
                        }
                    } else {
                        allItems = {};
                    }
                    allItems[tags] = items;
                    this.setStorage('items', allItems);
                }
            },
            fetchSettings: function () {
                var settings = {
                    logReputation: false,
                    spread: false,
                    startDate: 'Any',
                    isAnswered: 'All',
                    isClosed: 'All'
                };
                var storedSettings = this.getStorage('settings');
                if (typeof storedSettings !== 'undefined') {
                    if (typeof storedSettings.logReputation === 'boolean') {
                        settings.logReputation = storedSettings.logReputation;
                    }
                    if (typeof storedSettings.spread === 'boolean') {
                        settings.spread = storedSettings.spread;
                    }
                    if (typeof storedSettings.startDate === 'string') {
                        settings.startDate = storedSettings.startDate;
                    }
                    if (typeof storedSettings.isAnswered === 'string') {
                        settings.isAnswered = storedSettings.isAnswered;
                    }
                    if (typeof storedSettings.isClosed === 'string') {
                        settings.isClosed = storedSettings.isClosed;
                    }
                }
                return settings;
            },
            saveSettings: function (settings) {
                this.setStorage('settings', settings);
            }
        },
        settings: {
            getCurrentSettings: function () {
                var logReputation = $('#tag-health .reputation-button').hasClass('log');
                var spread = $('#tag-health .style-button').hasClass('spread');
                var startDate = $('#tag-health .time-button').html();
                var isAnswered = $('#tag-health .answered-button').html();
                var isClosed = $('#tag-health .closed-button').html();
                return {
                    logReputation: logReputation,
                    spread: spread,
                    startDate: startDate,
                    isAnswered: isAnswered,
                    isClosed: isClosed
                };
            },
            changeCurrentSettings: function () {
                if ($(this).is('#tag-health .reputation-button')) {
                    if ($(this).hasClass('log')) {
                        $(this).html('reputation').removeClass('log');
                    } else {
                        $(this).html('log(reputation)').addClass('log');
                    }
                }
                if ($(this).is('#tag-health .style-button')) {
                    if ($(this).hasClass('spread')) {
                        $(this).removeClass('spread');
                    } else {
                        $(this).addClass('spread');
                    }
                }
                if ($(this).is('#tag-health .time-button')) {
                    switch ($(this).html()) {
                        case '1 hour':
                            $(this).html('6 hours');
                            break;
                        case '6 hours':
                            $(this).html('12 hours');
                            break;
                        case '12 hours':
                            $(this).html('1 day');
                            break;
                        case '1 day':
                            $(this).html('1 week');
                            break;
                        case '1 week':
                            $(this).html('1 month');
                            break;
                        case '1 month':
                            $(this).html('6 months');
                            break;
                        case '6 months':
                            $(this).html('1 year');
                            break;
                        case '1 year':
                            $(this).html('Any');
                            break;
                        default:
                            $(this).html('1 hour');
                            break;
                    }
                }
                if ($(this).is('#tag-health .answered-button')) {
                    switch ($(this).html()) {
                        case 'Answered':
                            $(this).html('Unanswered');
                            break;
                        case 'Unanswered':
                            $(this).html('All');
                            break;
                        default:
                            $(this).html('Answered');
                            break;
                    }
                }
                if ($(this).is('#tag-health .closed-button')) {
                    switch ($(this).html()) {
                        case 'Closed':
                            $(this).html('Not closed');
                            break;
                        case 'Not closed':
                            $(this).html('All');
                            break;
                        default:
                            $(this).html('Closed');
                            break;
                    }
                }
            }
        },
        init: {
            all: function() {
                if (TagHealth.version.checkLocal()) {
                    console.log('init');
                    this.createStyle();
                    this.createModule();
                    this.initModule();
                    TagHealth.version.checkRemote();
                }
            },
            createStyle: function () {
                $('head').append('\
                    <style>\
                    #content {\
                        position: relative;\
                        overflow: hidden;\
                    }\
                    #tag-health {\
                        \
                    }\
                    #tag-health.expanded {\
                        position: absolute;\
                        background-color: ' + TagHealth.data.getBackgroundColor() + ';\
                        border: 1px solid #ccc;\
                        -webkit-box-shadow: 0 2px 5px rgba(0,0,0,0.3);\
                        -moz-box-shadow:    0 2px 5px rgba(0,0,0,0.3);\
                        box-shadow:         0 2px 5px rgba(0,0,0,0.3);\
                        padding: 15px;\
                    }\
                    #tag-health #tag-health-plot {\
                        display: table;\
                        border-collapse: collapse;\
                        position: relative;\
                        width: 98%;\
                        height: 150px;\
                    }\
                    #tag-health.expanded #tag-health-plot {\
                        width: 500px;\
                        height: 200px;\
                    }\
                    #tag-health .tag-health-dot {\
                        position: absolute;\
                        width: 7px;\
                        height: 7px;\
                        margin-top: ' + (function () {
                            if (TagHealth.browser.isChrome) {
                                return '-2.5';
                            } else if (TagHealth.browser.isSafari) {
                                return '-3';
                            } else {
                                return '-4';
                            }
                        })() + 'px;\
                        margin-left: ' + (function () {
                            if (TagHealth.browser.isChrome) {
                                return '-2.5';
                            } else if (TagHealth.browser.isSafari) {
                                return '-3';
                            } else {
                                return '-4';
                            }
                        })() + 'px;\
                    }\
                    #tag-health .tag-health-dot a {\
                        display: block;\
                        width: 7px;\
                        height: 7px;\
                        text-decoration: none;\
                    }\
                    #tag-health .tag-health-dot .cross {\
                        position: relative;\
                        width: 7px;\
                        height: 7px;\
                        transform: rotate(45deg);\
                        -ms-transform: rotate(45deg);\
                        -webkit-transform: rotate(45deg);\
                        opacity: 0.4;\
                    }\
                    #tag-health .tag-health-dot .cross:before, #tag-health .tag-health-dot .cross:after {\
                        content: "";\
                        position: absolute;\
                        z-index: -1;\
                        background-color: ' + TagHealth.data.getAnchorColor() + ';\
                    }\
                    #tag-health .tag-health-dot .cross:before {\
                        left: 50%;\
                        margin-left: -7.5%;\
                        width: 15%;\
                        height: 100%;\
                    }\
                    #tag-health .tag-health-dot .cross:after {\
                        top: 50%;\
                        margin-top: -7.5%;\
                        height: 15%;\
                        width: 100%;\
                    }\
                    #tag-health .tag-health-dot .cross.spread:before, #tag-health .tag-health-dot .cross.spread:after {\
                        -webkit-box-shadow: 0px 0px 3px 1px ' + TagHealth.data.getAnchorColor() + ';\
                        -moz-box-shadow:    0px 0px 3px 1px ' + TagHealth.data.getAnchorColor() + ';\
                        box-shadow:         0px 0px 3px 1px ' + TagHealth.data.getAnchorColor() + ';\
                    }\
                    #tag-health .tag-health-dot .cross.spread:before {\
                        width: 0;\
                    }\
                    #tag-health .tag-health-dot .cross.spread:after {\
                        height: 0;\
                    }\
                    #tag-health .tag-health-dot .line.one {\
                        -webkit-transform: rotate(45deg) translate(3.2px, 2.4px);\
                        -moz-transform: rotate(45deg) translate(1.8px, 2.4px);\
                        -o-transform: rotate(45deg) translate(2px, 2px);\
                        -ms-transform: rotate(45deg) translate(2px, 2px);\
                        transform: rotate(45deg) translate(1.8px, 2.4px);\
                    }\
                    #tag-health .tag-health-dot .line.two {\
                        -webkit-transform: rotate(135deg) translate(2.4px, -3.2px);\
                        -moz-transform: rotate(135deg) translate(2.4px, -1.8px);\
                        -o-transform: rotate(135deg) translate(2px, -2px);\
                        -ms-transform: rotate(135deg) translate(2px, -2px);\
                        transform: rotate(135deg) translate(2.4px, -1.8px);\
                    }\
                    #tag-health #tag-health-plot .row {\
                        display: table-row;\
                        height: 50%;\
                    }\
                    #tag-health #tag-health-plot .row.top {\
                        border-bottom: 1px solid #ccc;\
                    }\
                    #tag-health #tag-health-plot .row.bottom {\
                        \
                    }\
                    #tag-health #tag-health-plot .cell {\
                        display: table-cell;\
                    }\
                    #tag-health #tag-health-plot .cell.left {\
                        width: 10%;\
                        border-right: 1px solid #ccc;\
                    }\
                    #tag-health #tag-health-plot .cell.right {\
                        width: 90%;\
                    }\
                    #tag-health #tag-health-plot .score-label {\
                        position: absolute;\
                        top: 0;\
                        left: 12%;\
                        color: #999;\
                        font-size: 80%;\
                    }\
                    #tag-health.expanded #tag-health-plot .score-label {\
                        font-size: 100%;\
                    }\
                    #tag-health #tag-health-plot .reputation-button {\
                        position: absolute;\
                        bottom: 7%;\
                        right: 0;\
                        color: #999;\
                        font-size: 80%;\
                        cursor: pointer;\
                    }\
                    #tag-health.expanded #tag-health-plot .reputation-button {\
                        font-size: 100%;\
                    }\
                    #tag-health #tag-health-plot .reputation-button.log {\
                        \
                    }\
                    #tag-health #tag-health-plot .zero {\
                        position: absolute;\
                        top: 51%;\
                        right: 91%;\
                        color: #999;\
                        font-size: 80%;\
                    }\
                    #tag-health.expanded #tag-health-plot .zero {\
                        font-size: 100%;\
                    }\
                    #tag-health #tag-health-plot .max-score {\
                        position: absolute;\
                        top: 0;\
                        right: 91%;\
                        color: #999;\
                        font-size: 80%;\
                    }\
                    #tag-health.expanded #tag-health-plot .max-score {\
                        font-size: 100%;\
                    }\
                    #tag-health #tag-health-plot .min-score {\
                        position: absolute;\
                        bottom: 0;\
                        right: 91%;\
                        color: #999;\
                        font-size: 80%;\
                    }\
                    #tag-health.expanded #tag-health-plot .min-score {\
                        font-size: 100%;\
                    }\
                    #tag-health #tag-health-plot .max-reputation {\
                        position: absolute;\
                        bottom: 0;\
                        right: 0;\
                        color: #999;\
                        font-size: 80%;\
                    }\
                    #tag-health.expanded #tag-health-plot .max-reputation {\
                        font-size: 100%;\
                    }\
                    #tag-health #tag-health-plot .tooltip {\
                        display: none;\
                        position: absolute;\
                        font-size: 80%;\
                        line-height: 100%;\
                        max-width: 50%;\
                        border: 1px solid #ccc;\
                        background-color: ' + TagHealth.data.getBackgroundColor() + ';\
                        -webkit-box-shadow: 0 2px 5px rgba(0,0,0,0.3);\
                        -moz-box-shadow:    0 2px 5px rgba(0,0,0,0.3);\
                        box-shadow:         0 2px 5px rgba(0,0,0,0.3);\
                        z-index: 2;\
                        pointer-events: none;\
                    }\
                    #tag-health.expanded #tag-health-plot .tooltip {\
                        font-size: 100%;\
                    }\
                    #tag-health #tag-health-plot .tooltip .title {\
                        padding: 5px;\
                        color: #999;\
                    }\
                    #tag-health #tag-health-plot .tooltip .position {\
                        padding: 5px;\
                        color: ' + TagHealth.data.getBackgroundColor() + ';\
                        background-color: #999;\
                        text-align: right;\
                        white-space: nowrap;\
                        overflow: hidden;\
                    }\
                    #tag-health .item-row {\
                        position: relative;\
                        height: 20px;\
                        margin-top: 15px;\
                        color: #999;\
                        font-size: 80%;\
                    }\
                    #tag-health.expanded .item-row {\
                        font-size: 100%;\
                    }\
                    #tag-health .style-button {\
                        position: absolute;\
                        top: 0;\
                        left: 0;\
                        cursor: pointer;\
                    }\
                    #tag-health .style-button .example {\
                        color: ' + TagHealth.data.getAnchorColor() + ';\
                    }\
                    #tag-health .style-button.spread .example {\
                        display: inline-block;\
                        width: 6px;\
                        height: 6px;\
                        margin-top: 2px;\
                        color: transparent;\
                        background-color: ' + TagHealth.data.getAnchorColor() + ';\
                        border-radius: 50%;\
                        -webkit-box-shadow: 0px 0px 3px 1px ' + TagHealth.data.getAnchorColor() + ';\
                        -moz-box-shadow:    0px 0px 3px 1px ' + TagHealth.data.getAnchorColor() + ';\
                        box-shadow:         0px 0px 3px 1px ' + TagHealth.data.getAnchorColor() + ';\
                        opacity: 0.6;\
                        overflow: hidden;\
                    }\
                    #tag-health.expanded .style-button.spread a {\
                        width: 8px;\
                        height: 8px;\
                    }\
                    #tag-health .filter-button {\
                        position: absolute;\
                        top: 0;\
                        left: 20%;\
                        position: relative;\
                    }\
                    #tag-health.expanded .filter-button {\
                        left: 10%;\
                    }\
                    #tag-health .filter-button span {\
                        cursor: pointer;\
                    }\
                    #tag-health .filter-popup {\
                        display: none;\
                        position: absolute;\
                        top: 100%;\
                        left: 0;\
                        margin-top: 3px;\
                        border: 1px solid #ccc;\
                        background-color: ' + TagHealth.data.getBackgroundColor() + ';\
                        -webkit-box-shadow: 0 2px 5px rgba(0,0,0,0.3);\
                        -moz-box-shadow:    0 2px 5px rgba(0,0,0,0.3);\
                        box-shadow:         0 2px 5px rgba(0,0,0,0.3);\
                        z-index: 1;\
                    }\
                    #tag-health .filter-popup .filter-table {\
                        display: table;\
                        margin: 5px;\
                    }\
                    #tag-health .filter-popup .filter-row {\
                        display: table-row;\
                    }\
                    #tag-health .filter-popup .filter-cell {\
                        display: table-cell;\
                        padding: 3px;\
                    }\
                    #tag-health .filter-popup .filter-cell:last-of-type {\
                        min-width: 85px;\
                    }\
                    #tag-health .filter-popup a {\
                        text-decoration: none;\
                    }\
                    #tag-health .size-button {\
                        position: absolute;\
                        top: 0;\
                        left: 40%;\
                        cursor: pointer;\
                    }\
                    #tag-health.expanded .size-button {\
                        left: 20%;\
                    }\
                    #tag-health .update-button {\
                        display: none;\
                        position: absolute;\
                        top: 0;\
                        right: 0;\
                        cursor: pointer;\
                    }\
                    #tag-health .update-button a {\
                        color: #999;\
                        text-decoration: none;\
                    }\
                    </style>\
                ');
            },
            createModule: function () {
                var settings = TagHealth.storage.fetchSettings();
                $('#sidebar .module').first().after('\
                    <div id="tag-health-module" class="module">\
                        <div id="tag-health">\
                            <h4>Tag Health <img src="//sstatic.net/img/progress-dots.gif" /></h4>\
                            <div id="tag-health-plot">\
                                <div class="row top">\
                                     <div class="cell left"></div>\
                                     <div class="cell right"></div>\
                                </div>\
                                <div class="row bottom">\
                                     <div class="cell left"></div>\
                                     <div class="cell right"></div>\
                                </div>\
                                <div class="score-label">score</div>\
                                ' + (settings.logReputation ? '<div class="reputation-button log">log(reputation)</div>' : '<div class="reputation-button">reputation</div>') + '\
                                <div class="zero">0</div>\
                                <div class="max-score"></div>\
                                <div class="min-score"></div>\
                                <div class="max-reputation"></div>\
                                <div class="tooltip">\
                                    <div class="title"></div>\
                                    <div class="position"></div>\
                                </div>\
                            </div>\
                            <div class="item-row">\
                                <div class="style-button' + (settings.spread ? ' spread' : '') + '">style: <span class="example">&times;</span></div>\
                                <div class="filter-button">\
                                    <span>filter &#x25BE;</span>\
                                    <div class="filter-popup">\
                                        <div class="filter-table">\
                                            <div class="filter-row">\
                                                <div class="filter-cell">Time:</div>\
                                                <div class="filter-cell"><a class="time-button" href="javascript:void(0)">' + settings.startDate + '</a></div>\
                                            </div>\
                                            <div class="filter-row">\
                                                <div class="filter-cell">Answered:</div>\
                                                <div class="filter-cell"><a class="answered-button" href="javascript:void(0)">' + settings.isAnswered + '</a></div>\
                                            </div>\
                                            <div class="filter-row">\
                                                <div class="filter-cell">Closed:</div>\
                                                <div class="filter-cell"><a class="closed-button" href="javascript:void(0)">' + settings.isClosed + '</a></div>\
                                            </div>\
                                        </div>\
                                    </div>\
                                </div>\
                                <div class="size-button">expand</div>\
                                <div class="update-button"><a href="' + TagHealth.defaults.scriptURL + '">update</a></div>\
                            </div>\
                        </div>\
                    </div>\
                ');
                $('#tag-health h4').css(TagHealth.helpers.getStyleObject($('#tag-health h4'))).css({
                    width: '',
                    height: ''
                });
            },
            initModule: function () {
                TagHealth.process.getAllQuestions(function (items) {
                    $('#tag-health').data('items', items);
                    $('#tag-health h4 img').remove();
                    var settings = TagHealth.storage.fetchSettings();
                    TagHealth.process.generatePlot(settings);
                });
                $('#tag-health .filter-button span').on('click', function () {
                    $('#tag-health .filter-popup').toggle();
                });
                $('#tag-health .reputation-button, #tag-health .style-button, #tag-health .time-button, #tag-health .answered-button, #tag-health .closed-button').on('click', function () {
                    TagHealth.settings.changeCurrentSettings.apply(this);
                    var settings = TagHealth.settings.getCurrentSettings();
                    TagHealth.storage.saveSettings(settings);
                    TagHealth.process.generatePlot(settings);
                });
                // Rearranging the points when hovered to make them easier click targets since they often overlap
                $(window).on('mousemove', function (event) {
                    function isHover(element) {
                        var left = element.offset().left,
                            top = element.offset().top,
                            right = left + element.outerWidth(),
                            bottom = top + element.outerHeight();
                        return (event.pageX > left && event.pageX < right && event.pageY > top && event.pageY < bottom);
                    }
                    var hoverPoint = $();
                    $('.tag-health-dot a').each(function () {
                        if (!hoverPoint.length && isHover($(this))) {
                            hoverPoint = $(this);
                        }
                    });
                    if (hoverPoint.length) {
                        $('.tag-health-dot').css({
                            zIndex: ''
                        });
                        hoverPoint.parent().css({
                            zIndex: 1
                        });
                    }
                });
                $('body').on('mouseover', '.tag-health-dot a', function () {
                    var plot = $('#tag-health-plot');
                    var tooltip = $('#tag-health-plot .tooltip').stop(true, true).show();
                    var top = $(this).parent().position().top / plot.height() * 100 + 10;
                    var left = $(this).parent().position().left / plot.width() * 100;
                    var right = 100 - left;
                    if (left < 50) {
                        tooltip.css({
                            top: top + '%',
                            left: left + '%',
                            right: ''
                        });
                    } else {
                        tooltip.css({
                            top: top + '%',
                            left: '',
                            right: right + '%'
                        });
                    }
                    var title = $(this).parent().data('title');
                    var score = $(this).parent().data('score');
                    var reputation = $(this).parent().data('reputation');
                    var position = (function () {
                        var position = '';
                        if (score === 1) {
                            position += score + ' vote ';
                        } else {
                            position += score + ' votes ';
                        }
                        if (reputation < 10000) {
                            position += reputation + ' rep';
                        } else if (reputation < 1000000) {
                            position += (reputation / 1000).toFixed(1).replace('.0', '') + 'k rep';
                        } else {
                            position += (reputation / 1000000).toFixed(1).replace('.0', '') + 'm rep';
                        }
                        return position;
                    })();
                    tooltip.find('.title').html(title);
                    tooltip.find('.position').html(position);
                    // Typeset the title if MathJax is present
                    if (window.MathJax) {
                        MathJax.Hub.Queue(["Typeset", MathJax.Hub, tooltip.find('.title').get(0)]);
                    }
                }).on('mouseout', '.tag-health-dot a', function () {
                    $('#tag-health-plot .tooltip').fadeOut(function () {
                        $(this).find('.title').html('');
                        $(this).find('.position').html('');
                    });
                });
                $('#tag-health .size-button').on('click', function () {
                    if ($('#tag-health').hasClass('expanded')) {
                        $(this).html('expand');
                        $('#tag-health').removeClass('expanded').css({
                            top: '',
                            right: ''
                        }).appendTo('#tag-health-module');
                        $('#tag-health h4').css({
                            backgroundImage: ''
                        });
                        $('#tag-health-module').css({
                            height: ''
                        });
                    } else {
                        $(this).html('collapse');
                        var top = $('#tag-health').offset().top - $('#content').offset().top;
                        $('#tag-health').addClass('expanded').css({
                            top: top,
                            right: 5
                        }).appendTo('#content');
                        $('#tag-health h4').css({
                            backgroundImage: 'none'
                        });
                        $('#tag-health-module').css({
                            height: $('#tag-health').outerHeight()
                        });
                    }
                    var settings = TagHealth.settings.getCurrentSettings();
                    TagHealth.process.generatePlot(settings);
                });
            }
        }
    };

    if ($('body').hasClass('tagged-questions-page')) {
        TagHealth.init.all();
    }
});
/**
 * Kaltura HTML5 Library v2.97
 * https://html5video.org/kaltura-player/docs/
 *
 * This is free software released under the GPL2 see README more info
 * https://html5video.org/kaltura-player/docs/readme
 *
 * Copyright 2022 Kaltura Inc.
 */
window["MWEMBED_VERSION"] = "2.97";
window["SCRIPT_LOADER_URL"] = "https://cdnapi.kaltura.com/html5/html5lib/v2.97/load.php";
(function ($) {
    "use strict";
    if (window.kWidget) {
        return;
    }
    var kWidget = {
        startTime: {},
        loadTime: {},
        readyWidgets: {},
        widgetOriginalSettings: {},
        readyCallbacks: [],
        destroyedWidgets: {},
        perWidgetCallback: {},
        readyCallbackPerWidget: {},
        listenerList: {},
        userAgentPlayerRules: {},
        alreadyAddedThumbRules: false,
        iframeAutoEmbedCache: {},
        iframeUrls: {},
        setup: function () {
            var _this = this;
            mw.setConfig("version", MWEMBED_VERSION);
            this.checkEnvironment();
            this.overrideFlashEmbedMethods();
            this.proxyJsCallbackready();
            this.domReady(function () {
                _this.domIsReady = true;
                _this.proxyJsCallbackready();
            });
            this.domReady(function () {
                _this.rewriteObjectTags();
            });
        },
        checkEnvironment: function () {
            if (document.URL.indexOf("forceMobileHTML5") !== -1 && !mw.getConfig("disableForceMobileHTML5")) {
                mw.setConfig("forceMobileHTML5", true);
            }
            if (document.URL.indexOf("debugKalturaPlayer") !== -1) {
                mw.setConfig("debug", true);
            }
            if (document.URL.indexOf("forceKPlayer") !== -1) {
                mw.setConfig("EmbedPlayer.ForceKPlayer", true);
            }
            var ua = navigator.userAgent;
            var ieMatch = document.documentMode ? ["", document.documentMode] : ua.match(/MSIE\s([0-9]+)/);
            if ((ieMatch && parseInt(ieMatch[1]) < 9) || document.URL.indexOf("forceFlash") !== -1) {
                mw.setConfig("Kaltura.ForceFlashOnDesktop", true);
            }
            if (ua.indexOf("BlackBerry") != -1) {
                mw.setConfig("EmbedPlayer.DisableVideoTagSupport", true);
                mw.setConfig("EmbedPlayer.NotPlayableDownloadLink", true);
            }
            if (ua.indexOf("kalturaNativeCordovaPlayer") != -1) {
                mw.setConfig("EmbedPlayer.ForceNativeComponent", true);
                if (!mw.getConfig("EmbedPlayer.IsIframeServer")) {
                    var cordovaPath;
                    var cordovaKWidgetPath;
                    if (this.isAndroid()) {
                        cordovaPath = "/modules/EmbedPlayer/binPlayers/cordova/android/cordova.js";
                    } else {
                        cordovaPath = "/modules/EmbedPlayer/binPlayers/cordova/ios/cordova.js";
                    }
                    cordovaKWidgetPath = "/kWidget/cordova.kWidget.js";
                    document.write('<script src="' + this.getPath() + cordovaPath + '"></scr' + "ipt>");
                    document.write('<script src="' + this.getPath() + cordovaKWidgetPath + '"></scr' + "ipt>");
                }
            }
            if (/(iPhone|iPod|iPad)/i.test(ua)) {
                if (/OS [2-4]_\d(_\d)? like Mac OS X/i.test(ua) || /CPU like Mac OS X/i.test(ua)) {
                    mw.setConfig("Kaltura.UseAppleAdaptive", false);
                }
            }
            if (!mw.getConfig("EmbedPlayer.IsIframeServer")) {
                mw.setConfig("EmbedPlayer.IframeParentUrl", document.URL);
                mw.setConfig("EmbedPlayer.IframeParentTitle", document.title);
                mw.setConfig("EmbedPlayer.IframeParentReferrer", document.referrer);
                if (/(iPhone|iPod|iPad)/i.test(navigator.userAgent)) {
                    if (/OS [1-5](.*) like Mac OS X/i.test(navigator.userAgent)) {
                        window.onpageshow = function (evt) {
                            if (evt.persisted) {
                                document.body.style.display = "none";
                                location.reload();
                            }
                        };
                    }
                }
            }
            if (!mw.getConfig("Kaltura.SupressNonProductionUrlsWarning", false)) {
                if (
                    mw.getConfig("Kaltura.ServiceUrl").indexOf("kaltura.com") != -1 &&
                    this.getPath().indexOf("i.kaltura.com") == -1 &&
                    this.getPath().indexOf("isec.kaltura.com") == -1 &&
                    window.location.host != "kgit.html5video.org" &&
                    window.location.host != "player.kaltura.com" &&
                    window.location.host != "localhost"
                ) {
                    if (console && console.error) {
                        console.error("Error: Using non-production version of kaltura player library. Please see https://knowledge.kaltura.com/production-player-urls");
                    }
                }
            }
            if (mw.getConfig("EmbedPlayer.ForceNativeComponent")) {
                window.kNativeSdk = window.kNativeSdk || {};
                var typeMap = function (names) {
                    if (typeof names !== "string") {
                        return [];
                    }
                    names = names.split(",");
                    var mimeTypes = [];
                    var map = { dash: "application/dash+xml", mp4: "video/mp4", wvm: "video/wvm", hls: "application/vnd.apple.mpegurl" };
                    for (var i = 0; i < names.length; i++) {
                        mimeTypes.push(map[names[i]]);
                    }
                    return mimeTypes;
                };
                var drmFormats = kWidget.getHashParam("nativeSdkDrmFormats") || "wvm";
                var allFormats = kWidget.getHashParam("nativeSdkAllFormats") || "wvm,mp4,hls";
                window.kNativeSdk.drmFormats = typeMap(drmFormats);
                window.kNativeSdk.allFormats = typeMap(allFormats);
            }
        },
        proxiedJsCallback: null,
        waitForLibraryChecks: true,
        jsReadyCalledForIds: [],
        proxyJsCallbackready: function () {
            var _this = this;
            var jsCallbackProxy = function (widgetId) {
                if (_this.waitForLibraryChecks) {
                    _this.jsReadyCalledForIds.push(widgetId);
                    return;
                }
                _this.jsCallbackReady(widgetId);
            };
            if (!this.proxiedJsCallback) {
                this.proxiedJsCallback = window["jsCallbackReady"] || true;
                window["jsCallbackReady"] = jsCallbackProxy;
            }
            if (window["jsCallbackReady"].toString() != jsCallbackProxy.toString()) {
                this.proxiedJsCallback = window["jsCallbackReady"];
                window["jsCallbackReady"] = jsCallbackProxy;
            }
        },
        jsCallbackReady: function (widgetId) {
            var _this = this;
            _this.log("jsCallbackReady for " + widgetId);
            if (this.destroyedWidgets[widgetId]) {
                return;
            }
            var player = document.getElementById(widgetId);
            if (!player || !player.evaluate) {
                this.callJsCallback();
                this.log("Error:: jsCallbackReady called on invalid player Id:" + widgetId);
                return;
            }
            this.extendJsListener(player);
            if (this.widgetOriginalSettings[widgetId]) {
                player.kBind("kdpEmpty", function () {
                    player.sendNotification("changeMedia", { entryId: _this.widgetOriginalSettings[widgetId].entry_id });
                });
            }
            var kdpVersion = player.evaluate("{playerStatusProxy.kdpVersion}");
            if (mw.versionIsAtLeast("v3.7.0", kdpVersion)) {
                _this.log("Error: Unsuported KDP version");
            } else {
                player.kBind("mediaReady", function () {
                    player.setKDPAttribute("playerStatusProxy", "loadTime", ((new Date().getTime() - _this.startTime[widgetId]) / 1000.0).toFixed(2));
                });
            }
            if (!mw.getConfig("EmbedPlayer.IsIframeServer")) {
                document.onclick = function () {
                    if (!_this.destroyedWidgets[player.id]) {
                        player.sendNotification("onFocusOutOfIframe");
                    }
                };
            }
            if (typeof this.proxiedJsCallback == "function") {
                this.proxiedJsCallback(widgetId);
            }
            this.callJsCallback(widgetId);
        },
        callJsCallback: function (widgetId) {
            for (var i = 0; i < this.readyCallbacks.length; i++) {
                this.readyCallbacks[i](widgetId);
            }
            if (widgetId) {
                this.readyWidgets[widgetId] = true;
            }
        },
        playerModeChecksDone: function () {
            this.waitForLibraryChecks = false;
            for (var i = 0; i < this.jsReadyCalledForIds.length; i++) {
                var widgetId = this.jsReadyCalledForIds[i];
                this.jsCallbackReady(widgetId);
            }
            this.jsReadyCalledForIds = [];
        },
        isDownloadLinkPlayer: function () {
            if (window.location.href.indexOf("forceDownloadPlayer") > -1 || mw.getConfig("EmbedPlayer.NotPlayableDownloadLink")) {
                return true;
            }
            return false;
        },
        embed: function (targetId, settings) {
            if (this.isDownloadLinkPlayer()) {
                return this.thumbEmbed(targetId, settings, true);
            }
            var _this = this;
            if (typeof targetId === "object") {
                settings = targetId;
                if (!settings.targetId) {
                    this.log("Error: Missing target element Id");
                }
                targetId = settings.targetId;
            }
            this.startTime[targetId] = new Date().getTime();
            if (!settings.flashvars) {
                settings.flashvars = {};
            }
            if (this.isMobileDevice()) {
                if (settings.flashvars["layout"]) {
                    settings.flashvars.layout["skin"] = "kdark";
                }
            }
            if (document.URL.indexOf("forceKalturaNativeComponentPlayer") !== -1 || document.URL.indexOf("forceKalturaNative") !== -1) {
                settings.flashvars["nativeCallout"] = { plugin: true };
            }
            if (!settings.wid) {
                this.log("Error: kWidget.embed missing wid");
                return;
            }
            var uiconf_id = settings.uiconf_id;
            var confFile = settings.flashvars.confFilePath ? settings.flashvars.confFilePath : settings.flashvars.jsonConfig;
            if (!uiconf_id && !confFile) {
                this.log("Error: kWidget.embed missing uiconf_id or confFile");
                return;
            }
            var elm = document.getElementById(targetId);
            if (!elm) {
                this.log("Error: kWidget.embed could not find target: " + targetId);
                return false;
            }
            if (elm.getAttribute("name") == "kaltura_player_iframe_no_rewrite") {
                return;
            }
            if (settings.flashvars["localizationCode"] == "auto") {
                var browserLangCode = window.navigator.userLanguage || window.navigator.language;
                settings.flashvars["localizationCode"] = browserLangCode.split("-")[0];
            }
            try {
                elm.innerHTML = "";
            } catch (e) { }
            function checkSizeOverride(dim) {
                if (settings[dim]) {
                    if (parseInt(settings[dim]) == settings[dim]) {
                        settings[dim] += "px";
                    }
                    elm.style[dim] = settings[dim];
                }
            }
            checkSizeOverride("width");
            checkSizeOverride("height");
            if (this.destroyedWidgets[targetId]) {
                delete this.destroyedWidgets[targetId];
            }
            if (mw.getConfig("Kaltura.ForceIframeEmbed") === true) {
                this.outputIframeWithoutApi(targetId, settings);
                return;
            }
            if (settings.readyCallback) {
                var adCallback = !this.perWidgetCallback[targetId];
                this.perWidgetCallback[targetId] = settings.readyCallback;
                if (adCallback) {
                    this.addReadyCallback(function (videoId) {
                        if (videoId == targetId && _this.perWidgetCallback[videoId]) {
                            _this.perWidgetCallback[videoId](videoId);
                        }
                    });
                }
            }
            this.proxyJsCallbackready();
            settings.isHTML5 = this.isUiConfIdHTML5(uiconf_id);
            var doEmbedAction = function () {
                if (uiconf_id && _this.userAgentPlayerRules && _this.userAgentPlayerRules[uiconf_id]) {
                    var playerAction = _this.checkUserAgentPlayerRules(_this.userAgentPlayerRules[uiconf_id]);
                    switch (playerAction.mode) {
                        case "flash":
                            if (elm.nodeName.toLowerCase() == "object") {
                                return;
                            }
                            break;
                        case "leadWithHTML5":
                            settings.isHTML5 = _this.isUiConfIdHTML5(uiconf_id);
                            break;
                        case "forceMsg":
                            var msg = playerAction.val;
                            if (elm && elm.parentNode) {
                                var divTarget = document.createElement("div");
                                divTarget.style.backgroundColor = "#000000";
                                divTarget.style.color = "#a4a4a4";
                                divTarget.style.width = elm.style.width;
                                divTarget.style.height = elm.style.height;
                                divTarget.style.display = "table-cell";
                                divTarget.style.verticalAlign = "middle";
                                divTarget.style.textAlign = "center";
                                divTarget.style.fontSize = "1.5em";
                                divTarget.style.fontFamily = "Arial";
                                divTarget.style.fontWeight = "normal";
                                divTarget.innerHTML = unescape(msg);
                                elm.parentNode.replaceChild(divTarget, elm);
                            }
                            return;
                            break;
                    }
                }
                if (mw.getConfig("EmbedPlayer.ForceNativeComponent")) {
                    _this.outputCordovaPlayer(targetId, settings);
                } else if (settings.isHTML5) {
                    _this.outputHTML5Iframe(targetId, settings);
                } else {
                    _this.outputFlashObject(targetId, settings);
                }
            };
            var playerList = [{ kEmbedSettings: settings }];
            this.loadUiConfJs(playerList, function () {
                _this.proxyJsCallbackready();
                doEmbedAction();
            });
        },
        outputCordovaPlayer: function (targetId, settings) {
            var _this = this;
            if (cordova && cordova.kWidget) {
                cordova.kWidget.embed(targetId, settings);
            } else {
                setTimeout(function () {
                    _this.outputCordovaPlayer(targetId, settings);
                }, 500);
            }
        },
        addThumbCssRules: function () {
            if (this.alreadyAddedThumbRules) {
                return;
            }
            this.alreadyAddedThumbRules = true;
            var style = document.createElement("STYLE");
            style.type = "text/css";
            var imagePath = this.getPath() + "/modules/MwEmbedSupport/skins/common/images/";
            var cssText =
                ".kWidgetCentered {" +
                "max-height: 100%; " +
                "max-width: 100%; " +
                "position: absolute; " +
                "top: 0; left: 0; right: 0; bottom: 0; " +
                "margin: auto; " +
                "} " +
                "\n" +
                ".kWidgetPlayBtn { " +
                "cursor:pointer;" +
                "height: 53px;" +
                "width: 70px;" +
                "border-style: none;" +
                "top: 50%; left: 50%; margin-top: -26.5px; margin-left: -35px; " +
                "background: url('" +
                imagePath +
                "player_big_play_button.png') ;" +
                "z-index: 1;" +
                "} " +
                "\n" +
                ".kWidgetAccessibilityLabel { " +
                "font-size:0;" +
                "height: 1px;" +
                "overflow: hidden;" +
                "display:block;" +
                "position:absolute;" +
                "} " +
                "\n" +
                ".kWidgetPlayBtn:hover{ " +
                "background: url('" +
                imagePath +
                "player_big_play_button_hover.png');\"" +
                "} ";
            if (this.isIE()) {
                style.styleSheet.cssText = cssText;
            } else {
                style.innerHTML = cssText;
            }
            document.getElementsByTagName("HEAD")[0].appendChild(style);
        },
        getComputedSize: function (elm, dim) {
            var a = navigator.userAgent;
            if (a.indexOf("msie") != -1 && a.indexOf("opera") == -1) {
                return document.getElementById(theElt)["offset" + dim[0].toUpperCase() + dim.substr(1)];
            } else {
                return parseInt(document.defaultView.getComputedStyle(elm, "").getPropertyValue(dim));
            }
        },
        thumbEmbed: function (targetId, settings, forceDownload) {
            if (this.isDownloadLinkPlayer()) {
                forceDownload = true;
            }
            var _this = this;
            if (typeof targetId === "object") {
                settings = targetId;
                if (!settings.targetId) {
                    this.log("Error: Missing target element Id");
                }
                targetId = settings.targetId;
            } else {
                settings.targetId = targetId;
            }
            if (!settings.flashvars) {
                settings.flashvars = {};
            }
            settings.flashvars.autoPlay = true;
            settings.flashvars.thumbEmbedOrigin = true;
            this.addThumbCssRules();
            var elm = document.getElementById(targetId);
            if (!elm) {
                this.log("Error could not find target id, for thumbEmbed");
            }
            elm.innerHTML =
                "" +
                '<div style="position: relative; width: 100%; height: 100%;">' +
                '<button aria-label="Play video content"  class="kWidgetCentered kWidgetPlayBtn" ' +
                'id="' +
                targetId +
                '_playBtn" ></button>' +
                '<img class="kWidgetCentered" src="' +
                this.getKalturaThumbUrl(settings) +
                '" alt="Video thumbnail">' +
                "</div>";
            var playBtn = document.getElementById(targetId + "_playBtn");
            this.addEvent(playBtn, "click", function () {
                if (settings.readyCallback) {
                    var orgEmbedCallback = settings.readyCallback;
                }
                settings.readyCallback = function (playerId) {
                    var kdp = document.getElementById(playerId);
                    kdp.kBind("mediaReady", function () {
                        setTimeout(function () {
                            if (_this.isMobileDevice()) {
                                kdp.sendNotification("doPlay");
                            }
                        }, 0);
                    });
                    if (typeof orgEmbedCallback == "function") {
                        orgEmbedCallback(playerId);
                    }
                };
                settings.captureClickEventForiOS = true;
                if (forceDownload) {
                    window.open(_this.getDownloadLink(settings));
                } else {
                    kWidget.embed(settings);
                }
            });
            if (settings.thumbReadyCallback) {
                settings.thumbReadyCallback(targetId);
            }
        },
        destroy: function (target) {
            if (typeof target == "string") {
                target = document.getElementById(target);
            }
            if (!target) {
                this.log("Error destory called without valid target");
                return;
            }
            var targetId = target.id;
            var targetCss = target.style.cssText;
            var targetClass = target.className;
            var destoryId = target.getAttribute("id");
            for (var id in this.readyWidgets) {
                if (id == destoryId) {
                    delete this.readyWidgets[id];
                }
            }
            this.destroyedWidgets[destoryId] = true;
            var newNode = document.createElement("div");
            newNode.style.cssText = targetCss;
            newNode.id = targetId;
            newNode.className = targetClass;
            target.parentNode.replaceChild(newNode, target);
        },
        embedFromObjects: function (rewriteObjects) {
            for (var i = 0; i < rewriteObjects.length; i++) {
                var settings = rewriteObjects[i].kEmbedSettings;
                settings.width = rewriteObjects[i].width;
                settings.height = rewriteObjects[i].height;
                this.embed(rewriteObjects[i].id, rewriteObjects[i].kEmbedSettings);
            }
        },
        extendJsListener: function (player) {
            var _this = this;
            player.kBind = function (eventName, callback) {
                var callbackIndex = 0;
                var globalCBName = "";
                var _scope = this;
                if (typeof eventName == "string") {
                    var eventData = eventName.split(".", 2);
                    var eventNamespace = eventData[1] ? eventData[1] : "kWidget";
                    eventName = eventData[0];
                }
                if (typeof callback == "string") {
                    globalCBName = callback;
                } else if (typeof callback == "function") {
                    var generateGlobalCBName = function () {
                        globalCBName = "kWidget_" + eventName + "_cb" + callbackIndex;
                        if (window[globalCBName]) {
                            callbackIndex++;
                            generateGlobalCBName();
                        }
                    };
                    generateGlobalCBName();
                    window[globalCBName] = function () {
                        var args = Array.prototype.slice.call(arguments, 0);
                        if (mw.getConfig("debug")) {
                            setTimeout(function () {
                                callback.apply(_scope, args);
                            }, 0);
                        } else {
                            callback.apply(_scope, args);
                        }
                    };
                } else {
                    kWidget.log("Error: kWidget : bad callback type: " + callback);
                    return;
                }
                if (!_this.listenerList[eventNamespace]) {
                    _this.listenerList[eventNamespace] = {};
                }
                if (!_this.listenerList[eventNamespace][eventName]) {
                    _this.listenerList[eventNamespace][eventName] = globalCBName;
                }
                player.addJsListener(eventName, globalCBName);
                return player;
            };
            player.kUnbind = function (eventName, callbackName) {
                if (typeof eventName == "string") {
                    var eventData = eventName.split(".", 2);
                    var eventNamespace = eventData[1];
                    eventName = eventData[0];
                    if (eventNamespace) {
                        for (var listenerItem in _this.listenerList[eventNamespace]) {
                            if (!eventName) {
                                player.removeJsListener(listenerItem, _this.listenerList[eventNamespace][listenerItem]);
                            } else {
                                if (listenerItem == eventName) {
                                    player.removeJsListener(listenerItem, _this.listenerList[eventNamespace][listenerItem]);
                                    delete _this.listenerList[eventNamespace][listenerItem];
                                }
                            }
                        }
                        _this.listenerList[eventNamespace] = null;
                    } else {
                        var isCallback = typeof callbackName == "string";
                        if (isCallback) {
                            player.removeJsListener(eventName, callbackName);
                        }
                        for (var eventNamespace in _this.listenerList) {
                            for (var listenerItem in _this.listenerList[eventNamespace]) {
                                if (listenerItem == eventName) {
                                    if (!isCallback) {
                                        player.removeJsListener(eventName, _this.listenerList[eventNamespace][listenerItem]);
                                    }
                                    delete _this.listenerList[eventNamespace][listenerItem];
                                }
                            }
                        }
                    }
                }
                return player;
            };
        },
        outputFlashObject: function (targetId, settings, context) {
            context = context || document;
            var elm = context.getElementById(targetId);
            if (!elm && !elm.parentNode) {
                kWidget.log("Error embed target missing");
                return;
            }
            if (!settings.src) {
                var swfUrl = mw.getConfig("Kaltura.ServiceUrl") + "/index.php/kwidget" + "/wid/" + settings.wid + "/uiconf_id/" + settings.uiconf_id;
                if (settings.entry_id) {
                    swfUrl += "/entry_id/" + settings.entry_id;
                }
                if (settings.cache_st) {
                    swfUrl += "/cache_st/" + settings.cache_st;
                }
                settings["src"] = swfUrl;
            }
            settings["id"] = elm.id;
            elm.setAttribute("id", elm.id + "_container");
            var spanTarget = context.createElement("span");
            if (!settings.flashvars) {
                settings.flashvars = {};
            }
            if (settings.flashvars["jsCallbackReadyFunc"]) {
                kWidget.log("Error: Setting jsCallbackReadyFunc is not compatible with kWidget embed");
            }
            if (mw.getConfig("debug", true)) {
                settings.flashvars["debug"] = true;
            }
            var flashvarValue = this.flashVarsToString(settings.flashvars);
            var defaultParamSet = { allowFullScreen: "true", allowNetworking: "all", allowScriptAccess: "always", bgcolor: "#000000" };
            var output = '<object style="' + elm.style.cssText.replace(/^\s+|\s+$/g, "") + ';display:block;" ' + ' class="' + elm.className + '" ' + ' id="' + targetId + '"' + ' name="' + targetId + '"';
            output += ' data="' + settings["src"] + '" type="application/x-shockwave-flash"';
            if (window.ActiveXObject) {
                output += ' classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"';
            }
            output += ">";
            output += '<param name="movie" value="' + settings["src"] + '" />';
            output += '<param name="flashvars" value="' + flashvarValue + '" />';
            if (settings["params"]) {
                for (var key in settings["params"]) {
                    if (defaultParamSet[key]) {
                        defaultParamSet[key] = settings["params"][key];
                    } else {
                        output += '<param name="' + key + '" value="' + settings["params"][key] + '" />';
                    }
                }
            }
            for (var key in defaultParamSet) {
                if (defaultParamSet[key]) {
                    output += '<param name="' + key + '" value="' + defaultParamSet[key] + '" />';
                }
            }
            output += "</object>";
            var outputElemnt = function () {
                elm.parentNode.replaceChild(spanTarget, elm);
                spanTarget.innerHTML = output;
            };
            if (window.console && (window.console.firebug || window.console.exception)) {
                console.log("Warning firebug + firefox and dynamic flash kdp embed causes lockups in firefox" + ", ( delaying embed )");
                this.domReady(function () {
                    setTimeout(function () {
                        outputElemnt();
                    }, 2000);
                });
            } else {
                if (navigator.userAgent.indexOf("MSIE") != -1) {
                    setTimeout(function () {
                        outputElemnt();
                    }, 0);
                } else {
                    outputElemnt();
                }
            }
        },
        createIframe: function (targetId, widgetElm) {
            var iframeId = widgetElm.id + "_ifp";
            var iframeCssText = "border:0px; max-width: 100%; max-height: 100%; width:100%;height:100%;";
            var iframe = document.createElement("iframe");
            iframe.id = iframeId;
            iframe.scrolling = "no";
            iframe.name = iframeId;
            iframe.className = "mwEmbedKalturaIframe";
            iframe.setAttribute("title", "The Kaltura Dynamic Video Player");
            iframe.setAttribute("frameborder", "0");
            iframe.setAttribute("allowfullscreen", true);
            iframe.setAttribute("webkitallowfullscreen", true);
            iframe.setAttribute("mozallowfullscreen", true);
            iframe.setAttribute("allow", "autoplay *; fullscreen *; encrypted-media *");
            iframe.style.cssText = iframeCssText;
            try {
                var iframeHeight = widgetElm.style.height ? widgetElm.style.height : widgetElm.offsetHeight;
                if (this.isIOS() && parseInt(iframeHeight) > 0) {
                    iframe.style.height = iframeHeight;
                    var updateIframeID = setTimeout(function () {
                        iframe.style.height = "100%";
                    }, 6000);
                    window.addEventListener(
                        "message",
                        function (event) {
                            if (event.data === "layoutBuildDone") {
                                iframe.style.height = "100%";
                                clearTimeout(updateIframeID);
                            }
                        },
                        false
                    );
                }
            } catch (e) {
                this.log("Error when trying to set iframe height: " + e.message);
            }
            return iframe;
        },
        createIframeProxy: function (widgetElm) {
            var iframeProxy = document.createElement("div");
            iframeProxy.id = widgetElm.id;
            iframeProxy.name = widgetElm.name;
            var moreClass = widgetElm.className ? " " + widgetElm.className : "";
            iframeProxy.className = "kWidgetIframeContainer" + moreClass;
            iframeProxy.style.cssText = widgetElm.style.cssText + ";overflow: hidden";
            return iframeProxy;
        },
        createContentInjectCallback: function (cbName, iframe, iframeRequest, settings, ttlUnixVal) {
            var _this = this;
            window[cbName] = function (iframeData) {
                var newDoc = iframe.contentWindow.document;
                if (_this.isFirefox()) {
                    newDoc.open("text/html", "replace");
                } else {
                    newDoc.open();
                }
                newDoc.write(iframeData.content);
                if (mw.getConfig("EmbedPlayer.DisableContextMenu")) {
                    newDoc.getElementsByTagName("body")[0].setAttribute("oncontextmenu", "return false;");
                }
                newDoc.close();
                if (_this.isInlineScriptRequest(settings) && kWidget.storage.isSupported()) {
                    var iframeStoredData = kWidget.storage.getWithTTL(iframeRequest);
                    if (iframeStoredData == null) {
                        _this.cachePlayer(iframeRequest, iframeData.content, ttlUnixVal);
                    }
                }
                window[cbName] = null;
            };
        },
        createContentUpdateCallback: function (cbName, iframeRequest, settings, ttlUnixVal, maxCacheEntries) {
            var _this = this;
            window[cbName] = function (iframeData) {
                if (_this.isInlineScriptRequest(settings) && kWidget.storage.isSupported()) {
                    _this.cachePlayer(iframeRequest, iframeData.content, ttlUnixVal);
                }
                window[cbName] = null;
            };
        },
        getProtocol: function () {
            return "https"
            var protocolString = window.location.protocol.slice(0, -1);
            if (protocolString.match("^http")) {
                return protocolString;
            } else {
                return "https";
            }
        },
        requestPlayer: function (iframeRequest, widgetElm, targetId, cbName, settings) {
            var _this = this;
            if (iframeRequest.length > 2083) {
                this.log("Warning iframe requests (" + iframeRequest.length + ") exceeds 2083 charachters, won't cache on CDN.");
                var url = this.getIframeUrl();
                var requestData = iframeRequest;
                var isLowIE = document.documentMode && document.documentMode < 10;
                if (isLowIE && settings.flashvars.jsonConfig) {
                    jsonConfig = settings.flashvars.jsonConfig;
                    delete settings.flashvars.jsonConfig;
                    url += "?" + this.getIframeRequest(widgetElm, settings);
                    requestData = { jsonConfig: jsonConfig };
                    url += "&protocol=" + this.getProtocol();
                } else {
                    url += "?protocol=" + this.getProtocol();
                }
                $.ajax({ type: "POST", dataType: "text", url: url, data: requestData })
                    .done(function (data) {
                        var contentData = { content: data };
                        window[cbName](contentData);
                    })
                    .fail(function (e) {
                        _this.log("Error in player iframe request");
                    });
            } else {
                var iframeUrl = this.getIframeUrl() + "?" + iframeRequest;
                iframeUrl += "&protocol=" + this.getProtocol();
                this.iframeUrls[targetId] = iframeUrl;
                this.appendScriptUrl(iframeUrl + "&callback=" + cbName);
            }
        },
        isStorageMaxLimitExceeded: function (settings) {
            var maxCacheEntries = settings.flashvars["Kaltura.MaxCacheEntries"] || mw.getConfig("Kaltura.MaxCacheEntries");
            var cacheEntriesCount = kWidget.storage.getEntriesCount();
            return cacheEntriesCount >= maxCacheEntries;
        },
        cachePlayer: function (key, value, ttl) {
            var success = kWidget.storage.setWithTTL(key, value, ttl);
            if (success) {
                this.log("Player data stored in cache!");
            } else {
                this.log("Error: unable to store Player data in cache!");
            }
        },
        outputHTML5Iframe: function (targetId, settings) {
            var widgetElm = document.getElementById(targetId);
            var iframe = this.createIframe(targetId, widgetElm);
            var iframeProxy = this.createIframeProxy(widgetElm);
            iframeProxy.appendChild(iframe);
            widgetElm.parentNode.replaceChild(iframeProxy, widgetElm);
            var requestSettings = JSON.parse(JSON.stringify(settings));
            if (this.isInlineScriptRequest(requestSettings)) {
                requestSettings = this.getRuntimeSettings(requestSettings);
                this.widgetOriginalSettings[widgetElm.id] = settings;
                mw.setConfig("widgetOriginalSettings_" + widgetElm.id, settings);
            } else {
                settings.flashvars["inlineScript"] = false;
            }
            if (settings.captureClickEventForiOS && ((this.isSafari() && !this.isChrome()) || this.isAndroid())) {
                this.captureClickWrapedIframeUpdate(targetId, requestSettings, iframe);
            } else {
                var cbName = this.getIframeCbName(targetId);
                var iframeRequest = this.getIframeRequest(widgetElm, requestSettings);
                var ttlUnixVal = settings.flashvars["Kaltura.CacheTTL"] || mw.getConfig("Kaltura.CacheTTL");
                this.createContentInjectCallback(cbName, iframe, iframeRequest, requestSettings, ttlUnixVal);
                if (this.iframeAutoEmbedCache[targetId]) {
                    window[cbName](this.iframeAutoEmbedCache[targetId]);
                } else {
                    var iframeData = null;
                    if (kWidget.storage.isSupported()) {
                        iframeData = kWidget.storage.getWithTTL(iframeRequest);
                    }
                    if (!mw.getConfig("debug") && iframeData && iframeData != "null") {
                        window[cbName]({ content: iframeData });
                        cbName += "updateAsync";
                        this.createContentUpdateCallback(cbName, iframeRequest, requestSettings, ttlUnixVal);
                    }
                    if (kWidget.storage.isSupported() && this.isStorageMaxLimitExceeded(settings)) {
                        kWidget.storage.clearNS();
                    }
                    this.requestPlayer(iframeRequest, widgetElm, targetId, cbName, requestSettings);
                }
            }
        },
        getIframeCbName: function (iframeId) {
            var _this = this;
            var inx = 0;
            var baseCbName = "mwi_" + iframeId.replace(/[^0-9a-zA-Z]/g, "");
            var cbName = baseCbName + inx;
            while (window[cbName]) {
                _this.log("Warning: iframe callback already defined: " + cbName);
                inx++;
                cbName = baseCbName + inx;
            }
            return cbName;
        },
        resizeOvelayByHolderSize: function (overlaySize, parentSize, ratio) {
            var overlayRatio = overlaySize.width / overlaySize.height;
            var centeredParent = { width: parentSize.width * ratio, height: parentSize.height * ratio };
            var diffs = { width: parentSize.width - overlaySize.width, height: parentSize.height - overlaySize.height };
            var screenSize = { width: 0, height: 0 };
            if (diffs.width > 0 && diffs.height > 0) {
                screenSize.width = overlaySize.width;
                screenSize.height = overlaySize.height;
            } else if (diffs.width > 0 && diffs.height <= 0) {
                screenSize.height = centeredParent.height;
                screenSize.width = screenSize.height * overlayRatio;
            } else if (diffs.width <= 0 && diffs.height > 0) {
                screenSize.width = centeredParent.width;
                screenSize.height = screenSize.width / overlayRatio;
            } else if (diffs.width <= 0 && diffs.height <= 0) {
                if (diffs.width <= diffs.height) {
                    screenSize.width = centeredParent.width;
                    screenSize.height = screenSize.width / overlayRatio;
                } else {
                    screenSize.height = centeredParent.height;
                    screenSize.width = screenSize.height * overlayRatio;
                }
            }
            return screenSize;
        },
        captureClickWrapedIframeUpdate: function (targetId, settings, iframeElm) {
            var _this = this;
            var widgetElm = document.getElementById(targetId);
            var newDoc = iframeElm.contentDocument;
            newDoc.open();
            var vidSrc;
            var protocol = (location.protocol && location.protocol.slice(0, -1)) || "https";
            vidSrc = protocol + "://www.kaltura.com/p/243342/sp/24334200/playManifest/entryId/1_vp5cng42/flavorId/1_6wf0o9n7/format/url/protocol/" + protocol + "/a.mp4";
            newDoc.write(
                "<html>" +
                "<head></head>" +
                "<body>" +
                '<div class="mwPlayerContainer"  style="width: 100%; height: 100%">' +
                '<div class="videoHolder">' +
                '<div class="videoDisplay">' +
                '<video class="persistentNativePlayer" ' +
                'id="' +
                targetId +
                '" ' +
                'kwidgetid="' +
                settings.wid +
                '" ' +
                'kentryid="' +
                settings.entry_id +
                '" ' +
                'kuiconfid="' +
                settings.uiconf_id +
                '" ' +
                'src="' +
                vidSrc +
                '" ' +
                'style="width:100%;height:100%" ' +
                ">" +
                "</video>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "<scr" +
                "ipt>document.getElementById('" +
                targetId +
                "').play();</scr" +
                "ipt>" +
                '<div id="scriptsHolder"></div>' +
                "</body>" +
                "</html>"
            );
            newDoc.close();
            var cbName = this.getIframeCbName(targetId);
            window[cbName] = function (iframeParts) {
                var head = iframeElm.contentDocument.getElementsByTagName("head")[0] || iframeElm.documentElement;
                head.innerHTML = iframeParts.rawHead;
                iframeElm.contentDocument.getElementById("scriptsHolder").innerHTML = iframeParts.rawScripts;
                var nodeName = function (elem, name) {
                    return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
                };
                var evalScript = function (elem) {
                    var data = elem.text || elem.textContent || elem.innerHTML || "";
                    var head = iframeElm.contentDocument.getElementsByTagName("head")[0] || iframeElm.documentElement;
                    var script = iframeElm.contentDocument.createElement("script");
                    script.type = "text/javascript";
                    script.appendChild(document.createTextNode(data));
                    head.insertBefore(script, head.firstChild);
                    if (elem.parentNode) {
                        elem.parentNode.removeChild(elem);
                    }
                };
                var scripts = [];
                var headElm = head.childNodes;
                var ret = iframeElm.contentDocument.getElementById("scriptsHolder").childNodes;
                for (var i = 0; ret[i]; i++) {
                    if (scripts && nodeName(ret[i], "script") && (!ret[i].type || ret[i].type.toLowerCase() === "text/javascript")) {
                        scripts.push(ret[i].parentNode ? ret[i].parentNode.removeChild(ret[i]) : ret[i]);
                    }
                }
                for (var script in scripts) {
                    evalScript(scripts[script]);
                }
            };
            _this.appendScriptUrl(this.getIframeUrl() + "?" + this.getIframeRequest(widgetElm, settings) + "&callback=" + cbName + "&parts=1");
        },
        isInlineScriptRequest: function (settings) {
            if (mw.getConfig("debug") || this.isMobileDevice()) {
                return false;
            }
            if (settings.flashvars["inlineScript"]) {
                return true;
            }
            return false;
        },
        getRuntimeSettings: function (settings) {
            var runtimeSettings = {};
            var allowedVars = mw.getConfig("Kaltura.AllowedVars");
            allowedVars = allowedVars.split(",");
            var allowedVarsKeyPartials = mw.getConfig("Kaltura.AllowedVarsKeyPartials");
            allowedVarsKeyPartials = allowedVarsKeyPartials.split(",");
            var allowedPluginVars = mw.getConfig("Kaltura.AllowedPluginVars");
            allowedPluginVars = allowedPluginVars.split(",");
            var allowedPluginVarsValPartials = mw.getConfig("Kaltura.AllowedPluginVarsValPartials");
            allowedPluginVarsValPartials = allowedPluginVarsValPartials.split(",");
            for (var settingsKey in settings) {
                if (settingsKey == "entry_id") {
                    continue;
                }
                if (settingsKey == "flashvars") {
                    var runtimeFlashvars = (runtimeSettings[settingsKey] = {});
                    var flashvars = settings[settingsKey];
                    for (var flashvarKey in flashvars) {
                        if (typeof flashvars[flashvarKey] != "object") {
                            var flashvar = flashvars[flashvarKey];
                            if ([].indexOf.call(allowedVars, flashvarKey, 0) > -1) {
                                runtimeFlashvars[flashvarKey] = flashvar;
                                continue;
                            }
                            for (var idx in allowedVarsKeyPartials) {
                                if (flashvarKey.indexOf(allowedVarsKeyPartials[idx]) > -1) {
                                    runtimeFlashvars[flashvarKey] = flashvar;
                                    continue;
                                }
                            }
                        }
                        if (typeof flashvars[flashvarKey] == "object") {
                            var runtimePlugin = (runtimeFlashvars[flashvarKey] = {});
                            var plugin = flashvars[flashvarKey];
                            for (var pluginKey in plugin) {
                                var pluginVal = plugin[pluginKey];
                                if ([].indexOf.call(allowedPluginVars, pluginKey, 0) > -1) {
                                    runtimePlugin[pluginKey] = pluginVal;
                                    continue;
                                }
                                if (typeof pluginVal == "string") {
                                    for (var idx in allowedPluginVarsValPartials) {
                                        if (pluginVal.indexOf(allowedPluginVarsValPartials[idx]) > -1) {
                                            runtimePlugin[pluginKey] = plugin[pluginKey];
                                            continue;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    continue;
                }
                runtimeSettings[settingsKey] = settings[settingsKey];
            }
            return runtimeSettings;
        },
        getIframeRequest: function (elm, settings) {
            var iframeRequest = this.embedSettingsToUrl(settings);
            iframeRequest += "&playerId=" + elm.id;
            if (mw.getConfig("debug")) {
                iframeRequest += "&debug=true";
            }
            if (mw.getConfig("Kaltura.KWidgetPsPath")) {
                iframeRequest += "&pskwidgetpath=" + mw.getConfig("Kaltura.KWidgetPsPath");
            }
            if (mw.getConfig("Kaltura.AllowIframeRemoteService") && mw.getConfig("Kaltura.ServiceUrl").indexOf("kaltura.com") === -1 && mw.getConfig("Kaltura.ServiceUrl").indexOf("kaltura.org") === -1) {
                iframeRequest += kWidget.serviceConfigToUrl();
            }
            if (mw.getConfig("Kaltura.NoApiCache")) {
                iframeRequest += "&nocache=true";
            }
            if (this.isUiConfIdHTML5(settings.uiconf_id)) {
                iframeRequest += "&forceMobileHTML5=true";
            }
            iframeRequest += "&urid=" + MWEMBED_VERSION;
            return iframeRequest;
        },
        getIframeUrl: function () {
            var path = this.getPath();
            if (mw.getConfig("Kaltura.ForceIframeEmbed") === true) {
                path = path.replace("localhost", "127.0.0.1");
            }
            return path + "mwEmbedFrame.php";
        },
        getPath: function () {
            return SCRIPT_LOADER_URL.replace("load.php", "");
        },
        outputIframeWithoutApi: function (targetId, settings) {
            var targetEl = document.getElementById(targetId);
            var iframeSrc = this.getIframeUrl() + "?" + this.getIframeRequest(targetEl, settings) + "&iframeembed=true";
            var targetNode = document.getElementById(targetId);
            var parentNode = targetNode.parentNode;
            var iframe = document.createElement("iframe");
            iframe.src = iframeSrc;
            iframe.id = targetId;
            iframe.width = settings.width ? settings.width.replace(/px/, "") : "100%";
            iframe.height = settings.height ? settings.height.replace(/px/, "") : "100%";
            iframe.className = targetNode.className ? " " + targetNode.className : "";
            iframe.style.cssText = targetNode.style.cssText;
            iframe.style.border = "0px";
            iframe.style.overflow = "hidden";
            parentNode.replaceChild(iframe, targetNode);
        },
        addReadyCallback: function (readyCallback) {
            for (var widgetId in this.readyWidgets) {
                if (document.getElementById(widgetId)) {
                    readyCallback(widgetId);
                }
            }
            this.readyCallbacks.push(readyCallback);
            this.proxyJsCallbackready();
        },
        rewriteObjectTags: function () {
            var playerList = this.getKalutaObjectList();
            var _this = this;
            if (!playerList.length) {
                this.playerModeChecksDone();
                return;
            }
            if (this.isMissingUiConfJs(playerList)) {
                this.loadUiConfJs(playerList, function () {
                    _this.rewriteObjectTags();
                });
                return;
            }
            var serviceUrl = mw.getConfig("Kaltura.ServiceUrl");
            if (!mw.getConfig("Kaltura.AllowIframeRemoteService")) {
                if (!serviceUrl || serviceUrl.indexOf("kaltura.com") === -1) {
                    mw.setConfig("Kaltura.IframeRewrite", false);
                    mw.setConfig("Kaltura.UseManifestUrls", false);
                }
            }
            if (this.isHTML5FallForward()) {
                this.embedFromObjects(playerList);
                return;
            }
            for (var i = 0; i < playerList.length; i++) {
                if (this.isUiConfIdHTML5(playerList[i].kEmbedSettings["uiconf_id"])) {
                    this.embedFromObjects([playerList[i]]);
                }
            }
            if (!this.supportsFlash() && !this.supportsHTML5() && !mw.getConfig("Kaltura.ForceFlashOnDesktop")) {
                this.embedFromObjects(playerList);
                return;
            }
            this.playerModeChecksDone();
        },
        uiConfScriptLoadList: {},
        inLoaderUiConfJsDone: false,
        inLoaderUiConfJsCallbackSet: [],
        inLoaderUiConfJsCallback: function () {
            this.inLoaderUiConfJsDone = true;
            while (this.inLoaderUiConfJsCallbackSet.length) {
                this.inLoaderUiConfJsCallbackSet.shift()();
            }
        },
        isMissingUiConfJs: function (playerList) {
            if (this.inLoaderUiConfJsDone == false) {
                return true;
            }
            if (playerList.length == 0 || !mw.getConfig("Kaltura.EnableEmbedUiConfJs") || mw.getConfig("EmbedPlayer.IsIframeServer")) {
                return false;
            }
            for (var i = 0; i < playerList.length; i++) {
                var settings = playerList[i].kEmbedSettings;
                if (!this.uiConfScriptLoadList[settings.uiconf_id]) {
                    return true;
                }
            }
            return false;
        },
        uiConfScriptLoadListCallbacks: {},
        loadUiConfJs: function (playerList, doneCallback) {
            var _this = this;
            var callback = function () {
                if (_this.inLoaderUiConfJsDone) {
                    doneCallback();
                } else {
                    _this.inLoaderUiConfJsCallbackSet.push(doneCallback);
                }
                return;
            };
            var baseUiConfJsUrl = this.getPath() + "services.php?service=uiconfJs";
            if (mw.getConfig("Kaltura.KWidgetPsPath")) {
                baseUiConfJsUrl += "&pskwidgetpath=" + mw.getConfig("Kaltura.KWidgetPsPath");
            }
            if (!this.isMissingUiConfJs(playerList)) {
                callback();
                return;
            }
            var foundPlayerMissingUiConfJs = false;
            for (var i = 0; i < playerList.length; i++) {
                (function (settings) {
                    if (_this.uiConfScriptLoadList[settings.uiconf_id]) {
                        return;
                    }
                    foundPlayerMissingUiConfJs = true;
                    var cbName = "kUiConfJs_" + i + "_" + settings.uiconf_id;
                    if (!_this.uiConfScriptLoadListCallbacks[cbName]) {
                        _this.uiConfScriptLoadListCallbacks[cbName] = [callback];
                        window[cbName] = function () {
                            _this.uiConfScriptLoadList[settings.uiconf_id] = true;
                            for (var inx in _this.uiConfScriptLoadListCallbacks[cbName]) {
                                if (_this.uiConfScriptLoadListCallbacks[cbName].hasOwnProperty(inx) && typeof _this.uiConfScriptLoadListCallbacks[cbName][inx] == "function") {
                                    _this.uiConfScriptLoadListCallbacks[cbName][inx]();
                                }
                            }
                        };
                        var scriptUrl = baseUiConfJsUrl + _this.embedSettingsToUrl(settings) + "&callback=" + cbName;
                        if (scriptUrl.length > 4096) {
                            _this.log("Warning iframe requests (" + scriptUrl.length + ") exceeds 4096 characters, won't cache on CDN.");
                            $.ajax({ type: "POST", dataType: "text", url: _this.getIframeUrl(), data: _this.embedSettingsToUrl(settings) })
                                .done(function (data) {
                                    var contentData = { content: data };
                                    window[cbName](contentData);
                                })
                                .fail(function (e) {
                                    _this.log("Error in player iframe request");
                                });
                        } else {
                            _this.appendScriptUrl(scriptUrl);
                        }
                    } else {
                        _this.uiConfScriptLoadListCallbacks[cbName].push(callback);
                    }
                })(playerList[i].kEmbedSettings);
            }
            if (!foundPlayerMissingUiConfJs) {
                callback();
                return;
            }
        },
        log: function (msg) {
            if (typeof mw != "undefined" && !mw.getConfig("debug")) {
                return;
            }
            if (typeof console != "undefined" && console.log) {
                if (this.isIE8()) {
                    try {
                        console.log("kWidget: " + msg);
                    } catch (e) { }
                } else {
                    console.log("kWidget: " + msg);
                }
            }
        },
        supportsHTML5: function () {
            if (mw.getConfig("EmbedPlayer.DisableVideoTagSupport")) {
                return false;
            }
            var dummyvid = document.createElement("video");
            if (dummyvid.canPlayType) {
                return true;
            }
            return false;
        },
        supportsHTMLPlayerUI: function () {
            return this.supportsHTML5() || (this.isIE8() && this.supportsFlash());
        },
        supportsFlash: function () {
            if (mw.getConfig("EmbedPlayer.DisableHTML5FlashFallback")) {
                return false;
            }
            var version = this.getFlashVersion().split(",").shift();
            if (version < 10) {
                return false;
            } else {
                return true;
            }
        },
        getFlashVersion: function () {
            if (navigator.plugins && navigator.plugins.length) {
                try {
                    if (navigator.mimeTypes["application/x-shockwave-flash"].enabledPlugin) {
                        return (navigator.plugins["Shockwave Flash 2.0"] || navigator.plugins["Shockwave Flash"]).description.replace(/\D+/g, ",").match(/^,?(.+),?$/)[1];
                    }
                } catch (e) { }
            }
            try {
                try {
                    if (typeof ActiveXObject != "undefined") {
                        var axo = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");
                        try {
                            axo.AllowScriptAccess = "always";
                        } catch (e) {
                            return "6,0,0";
                        }
                    }
                } catch (e) { }
                return new ActiveXObject("ShockwaveFlash.ShockwaveFlash")
                    .GetVariable("$version")
                    .replace(/\D+/g, ",")
                    .match(/^,?(.+),?$/)[1];
            } catch (e) { }
            return "0,0,0";
        },
        isIOS: function () {
            return navigator.userAgent.indexOf("iPhone") != -1 || navigator.userAgent.indexOf("iPod") != -1 || navigator.userAgent.indexOf("iPad") != -1;
        },
        isFirefox: function () {
            return navigator.userAgent.indexOf("Firefox") != -1;
        },
        isIE: function () {
            return /\bMSIE\b/.test(navigator.userAgent);
        },
        isIE8: function () {
            return document.documentMode === 8;
        },
        isAndroid: function () {
            return navigator.userAgent.indexOf("Android ") !== -1 && navigator.userAgent.indexOf("Windows") === -1;
        },
        isSafari: function () {
            return /safari/.test(navigator.userAgent.toLowerCase());
        },
        isChrome: function () {
            return /chrome/.test(navigator.userAgent.toLowerCase());
        },
        isWindowsDevice: function () {
            var appVer = navigator.appVersion;
            return appVer.indexOf("Win") != -1 && (navigator.appVersion.indexOf("Phone") != -1 || navigator.appVersion.indexOf("CE") != -1);
        },
        isMobileDevice: function () {
            return this.isIOS() || this.isIpadOS() || this.isAndroid() || this.isWindowsDevice() || mw.getConfig("EmbedPlayer.ForceNativeComponent") || mw.getConfig("EmbedPlayer.SimulateMobile") === true;
        },
        isChromeCast: function () {
            return /CrKey/.test(navigator.userAgent);
        },
        isIpadOS: function () {
            return this.isSafari() && this.isTouchDevice && !this.isIOS();
        },
        isTouchDevice: function () {
            return !!("ontouchstart" in window) || (mw.getConfig("EmbedPlayer.EnableMobileSkin") === true && mw.getConfig("EmbedPlayer.SimulateMobile") === true);
        },
        isUiConfIdHTML5: function (uiconf_id) {
            var isHTML5 = this.isHTML5FallForward();
            if (this.userAgentPlayerRules && this.userAgentPlayerRules[uiconf_id]) {
                var playerAction = this.checkUserAgentPlayerRules(this.userAgentPlayerRules[uiconf_id]);
                if (playerAction.mode == "leadWithHTML5") {
                    isHTML5 = this.supportsHTMLPlayerUI();
                }
            }
            return isHTML5;
        },
        isHTML5FallForward: function () {
            if (this.isIOS() || mw.getConfig("forceMobileHTML5")) {
                return true;
            }
            if ((mw.getConfig("KalturaSupport.LeadWithHTML5") || mw.getConfig("Kaltura.LeadWithHTML5")) && this.supportsHTMLPlayerUI()) {
                return true;
            }
            if (this.isAndroid()) {
                if (mw.getConfig("EmbedPlayer.UseFlashOnAndroid") && kWidget.supportsFlash()) {
                    return false;
                } else {
                    return true;
                }
            }
            if (kWidget.supportsFlash()) {
                return false;
            }
            if (mw.getConfig("Kaltura.ForceFlashOnIE10")) {
                var ua = navigator.userAgent;
                var ie10Match = document.documentMode === 10;
                if (ie10Match) {
                    return false;
                }
            }
            if (mw.getConfig("Kaltura.ForceFlashOnDesktop")) {
                return false;
            }
            if (kWidget.supportsHTML5()) {
                return true;
            }
            if (mw.getConfig("Kaltura.IframeRewrite")) {
                return true;
            }
            return false;
        },
        getDownloadLink: function (settings) {
            var _this = this;
            var baseUrl = _this.getPath();
            var downloadUrl = baseUrl + "modules/KalturaSupport/download.php/wid/" + settings.wid;
            if (settings.uiconf_id) {
                downloadUrl += "/uiconf_id/" + settings.uiconf_id;
            }
            if (settings.entry_id) {
                downloadUrl += "/entry_id/" + settings.entry_id;
            }
            var flashVarsString = this.flashVarsToString(settings.flashvars);
            var ks = settings.ks;
            if (ks) {
                downloadUrl += "/?ks=" + ks + flashVarsString;
            } else {
                downloadUrl += "/?" + flashVarsString.substr(1, flashVarsString.length);
            }
            return downloadUrl;
        },
        getKalturaThumbUrl: function (settings) {
            if (settings.flashvars && settings.flashvars.thumbnailUrl !== undefined) {
                return settings.flashvars.thumbnailUrl;
            }
            var sizeParam = "";
            if (settings.width != "100%" && settings.width) {
                sizeParam += "/width/" + parseInt(settings.width);
            }
            if (settings.height != "100%" && settings.height) {
                sizeParam += "/height/" + parseInt(settings.height);
            }
            if (!settings.height && !settings.width) {
                sizeParam += "/height/480";
            }
            var vidParams = "";
            if (settings.vid_sec) {
                vidParams += "/vid_sec/" + settings.vid_sec;
            }
            if (settings.vid_slices) {
                vidParams += "/vid_slices/" + settings.vid_slices;
            }
            if (settings.ks) {
                vidParams += "/ks/" + settings.ks;
            }
            if (settings.flashvars && settings.flashvars.ks) {
                vidParams += "/ks/" + settings.flashvars.ks;
            }
            var flashVars = {};
            if (settings.flashvars && settings.flashvars.referenceId) {
                flashVars["referenceId"] = settings.flashvars.referenceId;
            }
            if (settings.p && !settings.partner_id) {
                settings.partner_id = settings.p;
            }
            if (!settings.partner_id && settings.wid) {
                settings.partner_id = settings.wid.replace("_", "");
            }
            var entryId = settings.entry_id ? "/entry_id/" + settings.entry_id : "";
            return this.getPath() + "modules/KalturaSupport/thumbnail.php" + "/p/" + settings.partner_id + "/uiconf_id/" + settings.uiconf_id + entryId + sizeParam + vidParams + "?" + this.flashVarsToUrl(flashVars);
        },
        getEmbedSettings: function (swfUrl, flashvars) {
            var embedSettings = {};
            if (typeof flashvars == "string") {
                flashvars = this.flashVars2Object(flashvars);
            }
            if (!flashvars) {
                flashvars = {};
            }
            if (!swfUrl) {
                return {};
            }
            var trim = function (str) {
                return str.replace(/^\s+|\s+$/g, "");
            };
            embedSettings.flashvars = flashvars;
            var dataUrlParts = swfUrl.split("/");
            var prevUrlPart = null;
            while (dataUrlParts.length) {
                var curUrlPart = dataUrlParts.pop();
                switch (curUrlPart) {
                    case "p":
                        embedSettings.wid = "_" + prevUrlPart;
                        embedSettings.p = prevUrlPart;
                        break;
                    case "wid":
                        embedSettings.wid = prevUrlPart;
                        embedSettings.p = prevUrlPart.replace(/_/, "");
                        break;
                    case "entry_id":
                        embedSettings.entry_id = prevUrlPart;
                        break;
                    case "uiconf_id":
                    case "ui_conf_id":
                        embedSettings.uiconf_id = prevUrlPart;
                        break;
                    case "cache_st":
                        embedSettings.cache_st = prevUrlPart;
                        break;
                }
                prevUrlPart = trim(curUrlPart);
            }
            for (var key in flashvars) {
                var val = flashvars[key];
                key = key.toLowerCase();
                if (key == "entryid") {
                    embedSettings.entry_id = val;
                }
                if (key == "uiconfid") {
                    embedSettings.uiconf_id = val;
                }
                if (key == "widgetid" || key == "widget_id") {
                    embedSettings.wid = val;
                }
                if (key == "partnerid" || key == "partner_id") {
                    embedSettings.wid = "_" + val;
                    embedSettings.p = val;
                }
                if (key == "referenceid") {
                    embedSettings.reference_id = val;
                }
            }
            if (!embedSettings.cache_st) {
                embedSettings.cache_st = 1;
            }
            return embedSettings;
        },
        flashVars2Object: function (flashvarsString) {
            var flashVarsSet = flashvarsString ? flashvarsString.split("&") : [];
            var flashvars = {};
            for (var i = 0; i < flashVarsSet.length; i++) {
                var currentVar = flashVarsSet[i].split("=");
                if (currentVar[0] && currentVar[1]) {
                    flashvars[currentVar[0]] = currentVar[1];
                }
            }
            return flashvars;
        },
        flashVarsToString: function (flashVarsObject) {
            var params = "";
            for (var i in flashVarsObject) {
                if (typeof flashVarsObject[i] == "object") {
                    for (var j in flashVarsObject[i]) {
                        params += "&" + "" + encodeURIComponent(i) + "." + encodeURIComponent(j) + "=" + encodeURIComponent(flashVarsObject[i][j]);
                    }
                } else {
                    params += "&" + "" + encodeURIComponent(i) + "=" + encodeURIComponent(flashVarsObject[i]);
                }
            }
            return params;
        },
        flashVarsToUrl: function (flashVarsObject) {
            var params = "";
            for (var i in flashVarsObject) {
                var curVal = typeof flashVarsObject[i] == "object" ? JSON.stringify(flashVarsObject[i]) : flashVarsObject[i];
                params += "&" + "flashvars[" + encodeURIComponent(i) + "]=" + encodeURIComponent(curVal);
            }
            params += "&" + "flashvars[" + encodeURIComponent("parentDomain") + "]=" + encodeURIComponent(document.URL);
            return params;
        },
        pageHasAudioOrVideoTags: function () {
            if (mw.getConfig("EmbedPlayer.RewriteSelector") === false || mw.getConfig("EmbedPlayer.RewriteSelector") == "") {
                return false;
            }
            if (document.getElementsByTagName("video").length != 0 || document.getElementsByTagName("audio").length != 0) {
                return true;
            }
            return false;
        },
        getKalutaObjectList: function () {
            var _this = this;
            var kalturaPlayerList = [];
            var objectList = document.getElementsByTagName("object");
            if (!objectList.length && document.getElementById("kaltura_player")) {
                objectList = [document.getElementById("kaltura_player")];
            }
            var tryAddKalturaEmbed = function (url, flashvars) {
                if (!url.match(/(kwidget|kdp)/gi)) {
                    return false;
                }
                var settings = _this.getEmbedSettings(url, flashvars);
                if (settings && settings.uiconf_id && settings.wid) {
                    objectList[i].kEmbedSettings = settings;
                    kalturaPlayerList.push(objectList[i]);
                    return true;
                }
                return false;
            };
            for (var i = 0; i < objectList.length; i++) {
                if (!objectList[i]) {
                    continue;
                }
                var swfUrl = "";
                var flashvars = {};
                var paramTags = objectList[i].getElementsByTagName("param");
                for (var j = 0; j < paramTags.length; j++) {
                    var pName = paramTags[j].getAttribute("name").toLowerCase();
                    var pVal = paramTags[j].getAttribute("value");
                    if (pName == "data" || pName == "src" || pName == "movie") {
                        swfUrl = pVal;
                    }
                    if (pName == "flashvars") {
                        flashvars = this.flashVars2Object(pVal);
                    }
                }
                if (tryAddKalturaEmbed(swfUrl, flashvars)) {
                    continue;
                }
                if (objectList[i].getAttribute("data")) {
                    if (tryAddKalturaEmbed(objectList[i].getAttribute("data"), flashvars)) {
                        continue;
                    }
                }
            }
            return kalturaPlayerList;
        },
        jQueryLoadCheck: function (callback) {
            if (!window.jQuery || !mw.versionIsAtLeast("1.7.2", window.jQuery.fn.jquery)) {
                if (window.jQuery) {
                    window.clientPagejQuery = window.jQuery.noConflict();
                    window.$ = window.clientPagejQuery;
                }
                this.appendScriptUrl(this.getPath() + "resources/jquery/jquery.min.js", function () {
                    window.kalturaJQuery = window.jQuery.noConflict();
                    if (window.clientPagejQuery) {
                        window.jQuery = window.$ = window.clientPagejQuery;
                    }
                    callback(window.kalturaJQuery, window.kalturaJQuery);
                });
            } else {
                window.kalturaJQuery = window.jQuery;
                callback(window.jQuery, window.jQuery);
            }
        },
        extend: function (obj) {
            var argSet = Array.prototype.slice.call(arguments, 1);
            for (var i = 0; i < argSet.length; i++) {
                var source = argSet[i];
                if (source) {
                    for (var prop in source) {
                        if (source[prop] && source[prop].constructor === Object) {
                            if (!obj[prop] || obj[prop].constructor === Object) {
                                obj[prop] = obj[prop] || {};
                                this.extend(obj[prop], source[prop]);
                            } else {
                                obj[prop] = source[prop];
                            }
                        } else {
                            obj[prop] = source[prop];
                        }
                    }
                }
            }
            return obj;
        },
        param: function (obj) {
            var o = "";
            var and = "";
            for (var i in obj) {
                o += and + i + "=" + encodeURIComponent(obj[i]);
                and = "&";
            }
            return o;
        },
        appendScriptUrls: function (urls, callback) {
            kWidget.log("appendScriptUrls");
            var _this = this;
            var loadCount = 0;
            if (urls.length == 0) {
                if (callback) callback();
                return;
            }
            for (var i = 0; i < urls.length; i++) {
                (function (inx) {
                    _this.appendScriptUrl(urls[inx], function () {
                        loadCount++;
                        if (loadCount == urls.length) {
                            if (callback) callback();
                        }
                    });
                })(i);
            }
        },
        appendScriptUrl: function (url, callback, docContext, callbackError) {
            if (!docContext) {
                docContext = window.document;
            }
            var head = docContext.getElementsByTagName("head")[0] || docContext.documentElement;
            var script = docContext.createElement("script");
            script.src = url;
            var done = false;
            script.onload = script.onerror = script.onreadystatechange = function () {
                if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                    done = true;
                    if (arguments && arguments[0] && arguments[0].type) {
                        if (arguments[0].type == "error") {
                            if (typeof callbackError == "function") {
                                callbackError();
                            }
                        } else {
                            if (typeof callback == "function") {
                                callback();
                            }
                        }
                    } else {
                        if (typeof callback == "function") {
                            callback();
                        }
                    }
                    script.onload = script.onerror = script.onreadystatechange = null;
                    if (head && script.parentNode) {
                        head.removeChild(script);
                    }
                }
            };
            head.insertBefore(script, head.firstChild);
        },
        appendCssUrl: function (url, context) {
            context = context || document;
            var head = context.getElementsByTagName("head")[0];
            var cssNode = context.createElement("link");
            cssNode.setAttribute("rel", "stylesheet");
            cssNode.setAttribute("type", "text/css");
            cssNode.setAttribute("href", url);
            head.appendChild(cssNode);
        },
        serviceConfigToUrl: function () {
            var serviceVars = ["ServiceUrl", "CdnUrl", "ServiceBase", "UseManifestUrls"];
            var urlParam = "";
            for (var i = 0; i < serviceVars.length; i++) {
                if (mw.getConfig("Kaltura." + serviceVars[i]) !== null) {
                    urlParam += "&" + serviceVars[i] + "=" + encodeURIComponent(mw.getConfig("Kaltura." + serviceVars[i]));
                }
            }
            return urlParam;
        },
        addEvent: function (obj, type, fn, useCapture) {
            if (obj.attachEvent) {
                obj["e" + type + fn] = fn;
                obj[type + fn] = function () {
                    obj["e" + type + fn](window.event);
                };
                obj.attachEvent("on" + type, obj[type + fn]);
            } else {
                obj.addEventListener(type, fn, !!useCapture);
            }
        },
        removeEvent: function (obj, type, fn) {
            if (obj.detachEvent) {
                obj.detachEvent("on" + type, obj[type + fn]);
                obj[type + fn] = null;
            } else {
                obj.removeEventListener(type, fn, false);
            }
        },
        isEmptyObject: function (obj) {
            var name;
            for (name in obj) {
                return false;
            }
            return true;
        },
        embedSettingsToUrl: function (settings) {
            var url = "";
            var kalturaAttributeList = ["uiconf_id", "entry_id", "wid", "p", "cache_st"];
            for (var attrKey in settings) {
                for (var i = 0; i < kalturaAttributeList.length; i++) {
                    if (kalturaAttributeList[i] == attrKey) {
                        url += "&" + attrKey + "=" + encodeURIComponent(settings[attrKey]);
                    }
                }
            }
            url += this.flashVarsToUrl(settings.flashvars);
            return url;
        },
        overrideFlashEmbedMethods: function () {
            var _this = this;
            var doEmbedSettingsWrite = function (settings, replaceTargetId, widthStr, heightStr) {
                if (widthStr) {
                    settings.width = widthStr;
                }
                if (heightStr) {
                    settings.height = heightStr;
                }
                kWidget.embed(replaceTargetId, settings);
            };
            if (window["flashembed"] && !window["originalFlashembed"]) {
                window["originalFlashembed"] = window["flashembed"];
                window["flashembed"] = function (targetId, attributes, flashvars) {
                    _this.domReady(function () {
                        var kEmbedSettings = kWidget.getEmbedSettings(attributes.src, flashvars);
                        if (kEmbedSettings.uiconf_id && (kWidget.isHTML5FallForward() || !kWidget.supportsFlash())) {
                            document.getElementById(targetId).innerHTML = '<div style="width:100%;height:100%" id="' + attributes.id + '"></div>';
                            doEmbedSettingsWrite(kEmbedSettings, attributes.id, attributes.width, attributes.height);
                        } else {
                            return originalFlashembed(targetId, attributes, flashvars);
                        }
                    });
                };
                var flashembedStaticMethods = ["asString", "getHTML", "getVersion", "isSupported"];
                for (var i = 0; i < flashembedStaticMethods.length; i++) {
                    window["flashembed"][flashembedStaticMethods[i]] = originalFlashembed;
                }
            }
            if (window["SWFObject"] && !window["SWFObject"].prototype["originalWrite"]) {
                window["SWFObject"].prototype["originalWrite"] = window["SWFObject"].prototype.write;
                window["SWFObject"].prototype["write"] = function (targetId) {
                    var swfObj = this;
                    _this.domReady(function () {
                        var kEmbedSettings = kWidget.getEmbedSettings(swfObj.attributes.swf, swfObj.params.flashVars);
                        if (kEmbedSettings.uiconf_id && (kWidget.isHTML5FallForward() || !kWidget.supportsFlash())) {
                            doEmbedSettingsWrite(kEmbedSettings, targetId, swfObj.attributes.width, swfObj.attributes.height);
                        } else {
                            swfObj.originalWrite(targetId);
                        }
                    });
                };
            }
            if (window["swfobject"] && !window["swfobject"]["originalEmbedSWF"]) {
                window["swfobject"]["originalEmbedSWF"] = window["swfobject"]["embedSWF"];
                window["swfobject"]["embedSWF"] = function (swfUrlStr, replaceElemIdStr, widthStr, heightStr, swfVersionStr, xiSwfUrlStr, flashvarsObj, parObj, attObj, callbackFn) {
                    _this.domReady(function () {
                        var kEmbedSettings = kWidget.getEmbedSettings(swfUrlStr, flashvarsObj);
                        if (kEmbedSettings.uiconf_id && (kWidget.isHTML5FallForward() || !kWidget.supportsFlash())) {
                            doEmbedSettingsWrite(kEmbedSettings, replaceElemIdStr, widthStr, heightStr);
                        } else {
                            window["swfobject"]["originalEmbedSWF"](swfUrlStr, replaceElemIdStr, widthStr, heightStr, swfVersionStr, xiSwfUrlStr, flashvarsObj, parObj, attObj, callbackFn);
                        }
                    });
                };
            }
        },
    };
    window.KWidget = kWidget;
    window.kWidget = kWidget;
})(window.jQuery);
if (!this.JSON) {
    this.JSON = {};
}
(function () {
    function f(n) {
        return n < 10 ? "0" + n : n;
    }
    if (typeof Date.prototype.toJSON !== "function") {
        Date.prototype.toJSON = function (key) {
            return isFinite(this.valueOf()) ? this.getUTCFullYear() + "-" + f(this.getUTCMonth() + 1) + "-" + f(this.getUTCDate()) + "T" + f(this.getUTCHours()) + ":" + f(this.getUTCMinutes()) + ":" + f(this.getUTCSeconds()) + "Z" : null;
        };
        String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", '"': '\\"', "\\": "\\\\" },
        rep;
    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string)
            ? '"' +
            string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) +
            '"'
            : '"' + string + '"';
    }
    function str(key, holder) {
        var i,
            k,
            v,
            length,
            mind = gap,
            partial,
            value = holder[key];
        if (value && typeof value === "object" && typeof value.toJSON === "function") {
            value = value.toJSON(key);
        }
        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }
        switch (typeof value) {
            case "string":
                return quote(value);
            case "number":
                return isFinite(value) ? String(value) : "null";
            case "boolean":
            case "null":
                return String(value);
            case "object":
                if (!value) {
                    return "null";
                }
                gap += indent;
                partial = [];
                if (Object.prototype.toString.apply(value) === "[object Array]") {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || "null";
                    }
                    v = partial.length === 0 ? "[]" : gap ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" : "[" + partial.join(",") + "]";
                    gap = mind;
                    return v;
                }
                if (rep && typeof rep === "object") {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        k = rep[i];
                        if (typeof k === "string") {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ": " : ":") + v);
                            }
                        }
                    }
                } else {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ": " : ":") + v);
                            }
                        }
                    }
                }
                v = partial.length === 0 ? "{}" : gap ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" : "{" + partial.join(",") + "}";
                gap = mind;
                return v;
        }
    }
    if (typeof JSON.stringify !== "function") {
        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = "";
            indent = "";
            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }
            } else if (typeof space === "string") {
                indent = space;
            }
            rep = replacer;
            if (replacer && typeof replacer !== "function" && (typeof replacer !== "object" || typeof replacer.length !== "number")) {
                throw new Error("JSON.stringify");
            }
            return str("", { "": value });
        };
    }
    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {
            var j;
            function walk(holder, key) {
                var k,
                    v,
                    value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }
            if (
                /^[\],:{}\s]*$/.test(
                    text
                        .replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, "")
                )
            ) {
                j = eval("(" + text + ")");
                return typeof reviver === "function" ? walk({ "": j }, "") : j;
            }
            throw new SyntaxError("JSON.parse");
        };
    }
})();
(function (mw, kWidget) {
    kWidget.deprecatedGlobals = function () {
        var globalFunctionMap = {
            kIsIOS: "isIOS",
            kSupportsHTML5: "supportsHTML5",
            kGetFlashVersion: "getFlashVersion",
            kSupportsFlash: "supportsFlash",
            kalturaIframeEmbed: "embed",
            kOutputFlashObject: "outputFlashObject",
            kIsHTML5FallForward: "isHTML5FallForward",
            kIframeWithoutApi: "outputIframeWithoutApi",
            kDirectDownloadFallback: "outputDirectDownload",
            kGetKalturaEmbedSettings: "getEmbedSetting",
            kGetKalturaPlayerList: "getKalutaObjectList",
            kCheckAddScript: "rewriteObjectTags",
            kAddScript: "loadHTML5Lib",
            kPageHasAudioOrVideoTags: "pageHasAudioOrVideoTags",
            kLoadJsRequestSet: "loadRequestSet",
            kOverideJsFlashEmbed: "overrideFlashEmbedMethods",
            kDoIframeRewriteList: "embedFromObjects",
            kEmbedSettingsToUrl: "embedSettingsToUrl",
            kGetAdditionalTargetCss: "getAdditionalTargetCss",
            kAppendCssUrl: "appendCssUrl",
            kAppendScriptUrl: "appendScriptUrl",
            kFlashVars2Object: "flashVars2Object",
            kFlashVarsToUrl: "flashVarsToUrl",
            kFlashVarsToString: "flashVarsToString",
            kServiceConfigToUrl: "serviceConfigToUrl",
            kRunMwDomReady: "rewriteObjectTags",
            restoreKalturaKDPCallback: false,
        };
        for (var gName in globalFunctionMap) {
            (function (gName) {
                window[gName] = function () {
                    if (globalFunctionMap[gName] === false) {
                        kWidget.log(gName + " is deprecated. This method no longer serves any purpose.");
                        return;
                    }
                    kWidget.log(gName + " is deprecated. Please use kWidget." + globalFunctionMap[gName]);
                    var args = Array.prototype.slice.call(arguments, 0);
                    if (typeof kWidget[globalFunctionMap[gName]] != "function") {
                        kWidget.log("Error kWidget missing method: " + globalFunctionMap[gName]);
                        return;
                    }
                    return kWidget[globalFunctionMap[gName]].apply(kWidget, args);
                };
            })(gName);
        }
    };
    kWidget.deprecatedGlobals();
})(window.mw, window.kWidget);
(function (kWidget) {
    var DomReady = (window.DomReady = {});
    var userAgent = navigator.userAgent.toLowerCase();
    var browser = {
        version: (userAgent.match(/.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/) || [])[1],
        safari: /webkit/.test(userAgent),
        opera: /opera/.test(userAgent),
        msie: /msie/.test(userAgent) && !/opera/.test(userAgent),
        mozilla: /mozilla/.test(userAgent) && !/(compatible|webkit)/.test(userAgent),
    };
    var readyBound = false;
    var isReady = false;
    var readyList = [];
    function domReady() {
        if (!isReady) {
            isReady = true;
            if (readyList) {
                for (var fn = 0; fn < readyList.length; fn++) {
                    readyList[fn].call(window, []);
                }
                readyList = [];
            }
        }
    }
    function addLoadEvent(func) {
        var oldonload = window.onload;
        if (typeof window.onload != "function") {
            window.onload = func;
        } else {
            window.onload = function () {
                if (oldonload) {
                    oldonload();
                }
                func();
            };
        }
    }
    function bindReady() {
        if (readyBound) {
            return;
        }
        readyBound = true;
        if (document.addEventListener && !browser.opera) {
            document.addEventListener("DOMContentLoaded", domReady, false);
        }
        if (browser.msie && window == top)
            (function () {
                if (isReady) return;
                try {
                    document.documentElement.doScroll("left");
                } catch (error) {
                    setTimeout(arguments.callee, 0);
                    return;
                }
                domReady();
            })();
        if (browser.opera) {
            document.addEventListener(
                "DOMContentLoaded",
                function () {
                    if (isReady) return;
                    for (var i = 0; i < document.styleSheets.length; i++)
                        if (document.styleSheets[i].disabled) {
                            setTimeout(arguments.callee, 0);
                            return;
                        }
                    domReady();
                },
                false
            );
        }
        if (browser.safari) {
            var numStyles;
            (function () {
                if (isReady) return;
                if (document.readyState != "loaded" && document.readyState != "complete") {
                    setTimeout(arguments.callee, 0);
                    return;
                }
                if (numStyles === undefined) {
                    var links = document.getElementsByTagName("link");
                    for (var i = 0; i < links.length; i++) {
                        if (links[i].getAttribute("rel") == "stylesheet") {
                            numStyles++;
                        }
                    }
                    var styles = document.getElementsByTagName("style");
                    numStyles += styles.length;
                }
                if (document.styleSheets.length != numStyles) {
                    setTimeout(arguments.callee, 0);
                    return;
                }
                domReady();
            })();
        }
        addLoadEvent(domReady);
    }
    DomReady.ready = function (fn, args) {
        bindReady();
        if (isReady || /loaded|complete/.test(document.readyState)) {
            fn.call(window, []);
        } else {
            readyList.push(function () {
                return fn.call(window, []);
            });
        }
    };
    bindReady();
    kWidget.domReady = DomReady.ready;
})(window.kWidget);
var logIfInIframe = typeof preMwEmbedConfig != "undefined" && preMwEmbedConfig["EmbedPlayer.IsIframeServer"] ? " ( iframe ) " : "";
kWidget.log("Kaltura HTML5 Version: " + MWEMBED_VERSION + logIfInIframe);
if (!window["mw"]) {
    window["mw"] = {};
}
if (!window["preMwEmbedReady"]) {
    window.preMwEmbedReady = [];
}
if (!window["preMwEmbedConfig"]) {
    window.preMwEmbedConfig = {};
}
if (!mw.setConfig) {
    mw.setConfig = function (set, value) {
        var valueQueue = {};
        if (typeof value != "undefined") {
            window.preMwEmbedConfig[set] = value;
        } else if (typeof set == "object") {
            for (var i in set) {
                window.preMwEmbedConfig[i] = set[i];
            }
        }
    };
}
if (!mw.getConfig) {
    mw.getConfig = function (key, defaultValue) {
        if (typeof window.preMwEmbedConfig[key] == "undefined") {
            if (typeof defaultValue != "undefined") {
                return defaultValue;
            }
            return null;
        } else {
            return window.preMwEmbedConfig[key];
        }
    };
}
if (!mw.versionIsAtLeast) {
    mw.versionIsAtLeast = function (minVersion, clientVersion) {
        if (typeof clientVersion == "undefined") {
            clientVersion = window.MWEMBED_VERSION;
        }
        minVersion = minVersion.replace(/[^\d.-]/g, "");
        clientVersion = clientVersion.replace(/[^\d.-]/g, "");
        var minVersionParts = minVersion.split(".");
        var clientVersionParts = clientVersion.split(".");
        for (var i = 0; i < minVersionParts.length; i++) {
            if (parseInt(clientVersionParts[i]) > parseInt(minVersionParts[i])) {
                return true;
            }
            if (parseInt(clientVersionParts[i]) < parseInt(minVersionParts[i])) {
                return false;
            }
        }
        return true;
    };
}
if (!mw.ready) {
    mw.ready = function (fn) {
        window.preMwEmbedReady.push(fn);
    };
}
mw.getKalturaThumbUrl = function (entry) {
    kWidget.log("mw.getKalturaThumbUrl is deprecated. Please use kWidget.getKalturaThumbUrl");
    return kWidget.getKalturaThumbUrl(entry);
};
kWidget.getUserAgentPlayerRulesMsg = function (ruleSet) {
    return kWidget.checkUserAgentPlayerRules(ruleSet, true);
};
kWidget.addUserAgentRule = function (uiconfId, rule, action) {
    var ruleInx = 0;
    if (kWidget.userAgentPlayerRules[uiconfId]) {
        for (ruleInx in kWidget.userAgentPlayerRules[uiconfId]["rules"]);
    } else {
        kWidget.userAgentPlayerRules[uiconfId] = { rules: {}, actions: {} };
    }
    var ruleIndex = parseInt(ruleInx) + 1;
    kWidget.userAgentPlayerRules[uiconfId]["rules"][ruleIndex] = { regMatch: rule };
    kWidget.userAgentPlayerRules[uiconfId]["actions"][ruleIndex] = { mode: action, val: 1 };
};
kWidget.checkUserAgentPlayerRules = function (ruleSet, getMsg) {
    var ua = mw.getConfig("KalturaSupport_ForceUserAgent") ? mw.getConfig("KalturaSupport_ForceUserAgent") : navigator.userAgent;
    var flashMode = { mode: "flash", val: true };
    var noFlashMessage = mw.getConfig("strings.ks-no-flash-installed") ? mw.getConfig("strings.ks-no-flash-installed") : "Flash does not appear to be installed or active. Please install or activate Flash.";
    var msgMode = { mode: "forceMsg", val: noFlashMessage };
    if (kWidget.isIE8() && !kWidget.supportsFlash()) {
        return msgMode;
    }
    if (!ruleSet.rules) {
        return flashMode;
    }
    var getAction = function (inx) {
        if (ruleSet.actions && ruleSet.actions[inx]) {
            return ruleSet.actions[inx];
        }
        return flashMode;
    };
    for (var i in ruleSet.rules) {
        var rule = ruleSet.rules[i];
        if (rule.match) {
            if (ua.indexOf(rule.match) !== -1) return getAction(i);
        } else if (rule.regMatch) {
            var regString = rule.regMatch.replace(/(^\/)|(\/$)/g, "");
            if (new RegExp(regString).test(ua)) {
                return getAction(i);
            }
        }
    }
    return flashMode;
};
(function (kWidget) {
    kWidget.seconds2npt = function (sec, show_ms) {
        if (isNaN(sec)) {
            kWidget.log("Warning: mediawiki.UtilitiesTime, trying to get npt time on NaN:" + sec);
            return "0:00:00";
        }
        var tm = kWidget.seconds2Measurements(sec);
        if (show_ms) {
            tm.seconds = Math.round(tm.seconds * 1000) / 1000;
        } else {
            tm.seconds = Math.round(tm.seconds);
        }
        if (tm.seconds < 10) {
            tm.seconds = "0" + tm.seconds;
        }
        if (tm.hours == 0) {
            hoursStr = "";
        } else {
            if (tm.minutes < 10) tm.minutes = "0" + tm.minutes;
            hoursStr = tm.hours + ":";
        }
        return hoursStr + tm.minutes + ":" + tm.seconds;
    };
    kWidget.npt2seconds = function (nptString) {
        if (!nptString) {
            return 0;
        }
        nptString = nptString.replace(/npt:|s/g, "");
        var hour = 0;
        var min = 0;
        var sec = 0;
        var times = nptString.split(":");
        if (times.length == 3) {
            sec = times[2];
            min = times[1];
            hour = times[0];
        } else if (times.length == 2) {
            sec = times[1];
            min = times[0];
        } else {
            sec = times[0];
        }
        sec = sec.replace(/,\s?/, ".");
        return parseInt(hour * 3600) + parseInt(min * 60) + parseFloat(sec);
    };
    kWidget.seconds2Measurements = function (sec) {
        var tm = {};
        tm.days = Math.floor(sec / (3600 * 24));
        tm.hours = Math.floor(Math.round(sec) / 3600);
        tm.minutes = Math.floor((Math.round(sec) / 60) % 60);
        tm.seconds = Math.round(sec) % 60;
        return tm;
    };
    kWidget.getSliceCount = function (duration) {
        if (duration < 60) {
            return Math.round(duration) + 1;
        }
        if (duration < 120) {
            return Math.round(duration / 1.5) + 1;
        }
        if (duration < 240) {
            return Math.round(duration / 2) + 1;
        }
        return 200;
    };
    kWidget.getThumbSpriteOffset = function (thumbWidth, time, duration, forceSliceCount) {
        var sliceIndex = kWidget.getSliceIndexForTime(time, duration, forceSliceCount);
        return -(sliceIndex * thumbWidth) + "px 0px";
    };
    kWidget.getSliceIndexForTime = function (time, duration, forceSliceCount) {
        var sliceCount = forceSliceCount || this.getSliceCount(duration);
        var perc = time / duration;
        var sliceIndex = Math.ceil(sliceCount * perc);
        return sliceIndex;
    };
    kWidget.sanitize = function (str) {
        if (str) {
            str = str.replace(/<(?:.|\n)*?>/gm, "");
        }
        return str;
    };
    kWidget.getHashParam = function (key) {
        var hash = window.location.hash;
        if (hash) {
            var hashParams = hash.split("&");
            for (var i = 0; i < hashParams.length; i++) {
                if (hashParams[i].indexOf(key + "=") !== -1) {
                    return hashParams[i].split("=")[1];
                }
            }
        }
        return false;
    };
})(window.kWidget);
(function ($) {
    "use strict";
    function safe_add(x, y) {
        var lsw = (x & 0xffff) + (y & 0xffff),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
    }
    function bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }
    function md5_cmn(q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
    }
    function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function binl_md5(x, len) {
        x[len >> 5] |= 0x80 << len % 32;
        x[(((len + 64) >>> 9) << 4) + 14] = len;
        var i,
            olda,
            oldb,
            oldc,
            oldd,
            a = 1732584193,
            b = -271733879,
            c = -1732584194,
            d = 271733878;
        for (i = 0; i < x.length; i += 16) {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;
            a = md5_ff(a, b, c, d, x[i], 7, -680876936);
            d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
            a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = md5_gg(b, c, d, a, x[i], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
            a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
            d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = md5_hh(d, a, b, c, x[i], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
            a = md5_ii(a, b, c, d, x[i], 6, -198630844);
            d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    }
    function binl2rstr(input) {
        var i,
            output = "";
        for (i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i >> 5] >>> i % 32) & 0xff);
        }
        return output;
    }
    function rstr2binl(input) {
        var i,
            output = [];
        output[(input.length >> 2) - 1] = undefined;
        for (i = 0; i < output.length; i += 1) {
            output[i] = 0;
        }
        for (i = 0; i < input.length * 8; i += 8) {
            output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32;
        }
        return output;
    }
    function rstr_md5(s) {
        return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
    }
    function rstr_hmac_md5(key, data) {
        var i,
            bkey = rstr2binl(key),
            ipad = [],
            opad = [],
            hash;
        ipad[15] = opad[15] = undefined;
        if (bkey.length > 16) {
            bkey = binl_md5(bkey, key.length * 8);
        }
        for (i = 0; i < 16; i += 1) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5c5c5c5c;
        }
        hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
    }
    function rstr2hex(input) {
        var hex_tab = "0123456789abcdef",
            output = "",
            x,
            i;
        for (i = 0; i < input.length; i += 1) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt((x >>> 4) & 0x0f) + hex_tab.charAt(x & 0x0f);
        }
        return output;
    }
    function str2rstr_utf8(input) {
        return unescape(encodeURIComponent(input));
    }
    function raw_md5(s) {
        return rstr_md5(str2rstr_utf8(s));
    }
    function hex_md5(s) {
        return rstr2hex(raw_md5(s));
    }
    function raw_hmac_md5(k, d) {
        return rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d));
    }
    function hex_hmac_md5(k, d) {
        return rstr2hex(raw_hmac_md5(k, d));
    }
    function md5(string, key, raw) {
        if (!key) {
            if (!raw) {
                return hex_md5(string);
            }
            return raw_md5(string);
        }
        if (!raw) {
            return hex_hmac_md5(key, string);
        }
        return raw_hmac_md5(key, string);
    }
    $.md5 = md5;
})(this);
(function (kWidget, win, md5) {
    "use strict";
    var NS = "kalturaCache__";
    var ttlSuffix = "_ttl";
    var storage;
    var isStorageSupported = true;
    (function () {
        try {
            var localStorageApiExist = "localStorage" in win && win["localStorage"] != null && win["localStorage"] != undefined;
            if (localStorageApiExist) {
                storage = window.localStorage;
                var uid = new Date();
                storage.setItem(uid, uid);
                var fail = storage.getItem(uid) != uid;
                storage.removeItem(uid);
                if (fail) {
                    isStorageSupported = false;
                }
            } else {
                isStorageSupported = false;
            }
        } catch (exception) {
            isStorageSupported = false;
        }
    })();
    var storageManger = {
        get: function (cacheKey) {
            return storage.getItem(NS + md5(cacheKey));
        },
        getWithTTL: function (cacheKey) {
            var value = this.get(cacheKey);
            if (value) {
                var timestamp = storage.getItem(NS + md5(cacheKey) + ttlSuffix);
                if (timestamp && timestamp - new Date().getTime() < 0) {
                    this.deleteKey(md5(cacheKey));
                    this.deleteKey(md5(cacheKey) + ttlSuffix);
                    value = null;
                }
            }
            return value;
        },
        set: function (cacheKey, value) {
            var success = true;
            try {
                storage.setItem(NS + md5(cacheKey), value);
            } catch (err) {
                if (this.isQuotaExceeded(err)) {
                    success = false;
                }
            }
            return success;
        },
        setWithTTL: function (cacheKey, value, ttl) {
            var success = this.set(cacheKey, value);
            try {
                if (success) {
                    storage.setItem(NS + md5(cacheKey) + ttlSuffix, new Date().getTime() + ttl);
                    success = true;
                }
            } catch (err) {
                if (this.isQuotaExceeded(err)) {
                    this.deleteKey(cacheKey);
                    success = false;
                }
            }
            return success;
        },
        deleteKey: function (cacheKey) {
            storage.removeItem(NS + md5(cacheKey));
        },
        clearNS: function () {
            var arr = [];
            var i;
            for (i = 0; i < storage.length; i += 1) {
                if (storage.key(i).indexOf(NS) === 0) {
                    arr.push(storage.key(i));
                }
            }
            for (i = 0; i < arr.length; i += 1) {
                storage.removeItem(arr[i]);
            }
        },
        getEntriesCount: function () {
            var count = 0;
            var i;
            var key;
            var foundSuffix;
            for (i = 0; i < storage.length; i += 1) {
                key = storage.key(i);
                foundSuffix = key.match(ttlSuffix + "$");
                if (key.indexOf(NS) === 0 && foundSuffix === null) {
                    count += 1;
                }
            }
            return count;
        },
        isSupported: function () {
            return isStorageSupported;
        },
        isQuotaExceeded: function (e) {
            var quotaExceeded = false;
            if (e) {
                if (e.code) {
                    switch (e.code) {
                        case 22:
                            quotaExceeded = true;
                            break;
                        case 1014:
                            if (e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
                                quotaExceeded = true;
                            }
                            break;
                    }
                } else if (e.number === -2147024882) {
                    quotaExceeded = true;
                }
            }
            return quotaExceeded;
        },
    };
    kWidget.storage = storageManger;
})(window.kWidget, window, md5);
(function (kWidget) {
    "use strict";
    if (!kWidget) {
        kWidget = window.kWidget = {};
    }
    kWidget.api = function (options) {
        return this.init(options);
    };
    kWidget.api.prototype = {
        ks: null,
        type: "auto",
        callbackIndex: 0,
        baseParam: { apiVersion: "3.1", expiry: "86400", clientTag: "kwidget:v" + window["MWEMBED_VERSION"], format: 9, ignoreNull: 1 },
        init: function (options) {
            for (var i in options) {
                this[i] = options[i];
            }
            if (!this.serviceUrl) {
                this.serviceUrl = mw.getConfig("Kaltura.ServiceUrl");
            }
            if (!this.serviceBase) {
                this.serviceBase = mw.getConfig("Kaltura.ServiceBase");
            }
            if (!this.statsServiceUrl) {
                this.statsServiceUrl = mw.getConfig("Kaltura.StatsServiceUrl");
            }
            if (typeof this.disableCache == "undefined") {
                this.disableCache = mw.getConfig("Kaltura.NoApiCache");
            }
        },
        setKs: function (ks) {
            this.ks = ks;
        },
        getKs: function () {
            return this.ks;
        },
        forceKs: function (wid, callback, errorCallback) {
            if (this.getKs()) {
                callback(this.getKs());
                return true;
            }
            var _this = this;
            var ksParam = { action: "startwidgetsession", widgetId: wid };
            var param = kWidget.extend({ service: "session" }, this.baseParam, ksParam);
            this.doRequest(
                param,
                function (data) {
                    _this.ks = data.ks;
                    callback(_this.ks);
                },
                null,
                errorCallback
            );
        },
        doRequest: function (requestObject, callback, skipKS, errorCallback, withProxyData, apiHost) {
            var _this = this;
            var param = {};
            var globalCBName = null;
            if (this.disableCache === true) {
                param["nocache"] = "true";
            }
            for (var i in this.baseParam) {
                if (typeof param[i] == "undefined") {
                    param[i] = this.baseParam[i];
                }
            }
            if (requestObject["service"] != "user" && !skipKS) {
                kWidget.extend(param, this.handleKsServiceRequest(requestObject));
            } else {
                kWidget.extend(param, requestObject);
            }
            param["format"] = 1;
            param["kalsig"] = this.hashCode(kWidget.param(param));
            var serviceType = param["service"];
            delete param["service"];
            var timeoutError = setTimeout(function () {
                if (globalCBName) {
                    window[globalCBName] = undefined;
                }
                if (errorCallback) {
                    errorCallback();
                }
            }, mw.getConfig("Kaltura.APITimeout"));
            var handleDataResult = function (data) {
                clearTimeout(timeoutError);
                data = data || [];
                if (data.length > 1 && param["1:service"] == "session" && !withProxyData) {
                    _this.setKs(data[0].ks);
                    if (data.length == 2) {
                        data = data[1];
                    } else {
                        data.shift();
                    }
                }
                if (callback) {
                    callback(data);
                    callback = null;
                }
            };
            var userAgent = navigator.userAgent.toLowerCase();
            var forceJSONP = document.documentMode && document.documentMode <= 10;
            try {
                if (forceJSONP) {
                    throw "forceJSONP";
                }
                this.xhrRequest(_this.getApiUrl(serviceType, apiHost), param, function (data) {
                    handleDataResult(data);
                });
            } catch (e) {
                param["format"] = 9;
                delete param["kalsig"];
                var kalSig = this.hashCode(kWidget.param(param));
                param["kalsig"] = kalSig;
                var requestURL = _this.getApiUrl(serviceType) + "&" + kWidget.param(param);
                globalCBName = "kapi_" + kalSig;
                if (window[globalCBName]) {
                    this.callbackIndex++;
                    globalCBName = globalCBName + this.callbackIndex;
                }
                window[globalCBName] = function (data) {
                    handleDataResult(data);
                    window[globalCBName] = undefined;
                    try {
                        delete window[globalCBName];
                    } catch (e) { }
                };
                requestURL += "&callback=" + globalCBName;
                kWidget.appendScriptUrl(requestURL);
            }
        },
        xhrRequest: function (url, param, callback) {
            var requestMethod = this.type == "auto" ? (kWidget.param(param).length > 2000 ? "xhrPost" : "xhrGet") : this.type == "GET" ? "xhrGet" : "xhrPost";
            this[requestMethod](url, param, callback);
        },
        parseResponse: function (data) {
            var response = data;
            try {
                response = JSON.parse(data);
            } catch (e) { }
            return response;
        },
        xhrGet: function (url, param, callback) {
            var _this = this;
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    callback(_this.parseResponse(xmlhttp.responseText));
                }
            };
            xmlhttp.open("GET", url + "&" + kWidget.param(param), true);
            xmlhttp.send();
        },
        xhrPost: function (url, param, callback, headers) {
            var _this = this;
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    callback(_this.parseResponse(xmlhttp.responseText));
                }
            };
            xmlhttp.open("POST", url, true);
            if (headers) {
                for (var key in headers) {
                    if (headers.hasOwnProperty(key)) {
                        xmlhttp.setRequestHeader(key, headers[key]);
                    }
                }
                xmlhttp.send(param);
            } else {
                xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xmlhttp.send(kWidget.param(param));
            }
        },
        handleKsServiceRequest: function (requestObject) {
            var param = {};
            if (requestObject["ks"]) {
                this.ks = requestObject["ks"];
            }
            if (!requestObject.length && !this.getKs()) {
                requestObject = [requestObject];
            }
            if (requestObject.length) {
                param["service"] = "multirequest";
                param["action"] = "null";
                var mulitRequestIndex = 1;
                if (!this.getKs()) {
                    param[mulitRequestIndex + ":service"] = "session";
                    param[mulitRequestIndex + ":action"] = "startWidgetSession";
                    param[mulitRequestIndex + ":widgetId"] = this.wid;
                    mulitRequestIndex = 2;
                }
                for (var i = 0; i < requestObject.length; i++) {
                    var requestInx = mulitRequestIndex + i;
                    param[requestInx + ":ks"] = this.getKs() ? this.getKs() : "{1:result:ks}";
                    for (var paramKey in requestObject[i]) {
                        if (typeof requestObject[i][paramKey] == "object") {
                            for (var subParamKey in requestObject[i][paramKey]) {
                                param[requestInx + ":" + paramKey + ":" + subParamKey] = this.parseParam(requestObject[i][paramKey][subParamKey]);
                            }
                        } else {
                            param[requestInx + ":" + paramKey] = this.parseParam(requestObject[i][paramKey]);
                        }
                    }
                }
            } else {
                param = requestObject;
                param["ks"] = this.getKs();
            }
            return param;
        },
        parseParam: function (data) {
            var param = data;
            if (!this.getKs() && param !== undefined) {
                var paramParts = param.toString().match(/\{(\d+)(:result:.*)\}/);
                if (paramParts) {
                    var refObj = parseInt(paramParts[1]) + 1;
                    param = "{" + refObj + paramParts[2] + "}";
                }
            }
            return param;
        },
        getApiUrl: function (serviceType, apiHost) {
            var serviceUrl = mw.getConfig("Kaltura.ServiceUrl");
            if (serviceType && serviceType == "stats" && mw.getConfig("Kaltura.StatsServiceUrl")) {
                serviceUrl = mw.getConfig("Kaltura.StatsServiceUrl");
            }
            if (serviceType && serviceType == "liveStats" && mw.getConfig("Kaltura.LiveStatsServiceUrl")) {
                serviceUrl = mw.getConfig("Kaltura.LiveStatsServiceUrl");
            }
            if (serviceType && serviceType == "analytics" && mw.getConfig("Kaltura.AnalyticsUrl")) {
                serviceUrl = mw.getConfig("Kaltura.AnalyticsUrl");
            }
            if (apiHost) {
                serviceUrl = mw.getConfig(apiHost);
            }
            return serviceUrl + mw.getConfig("Kaltura.ServiceBase") + serviceType;
        },
        hashCode: function (str) {
            return md5(str);
        },
    };
})(window.kWidget);
mw.setConfig("debug", false);
mw.setConfig("Mw.XmlProxyUrl", "https://cdnapi.kaltura.com/html5/html5lib/v2.97/simplePhpXMLProxy.php");
mw.setConfig("Kaltura.UseManifestUrls", true);
mw.setConfig("Kaltura.Protocol", "http");
mw.setConfig("Kaltura.ServiceUrl", "https://cdnapi.kaltura.com");
mw.setConfig("Kaltura.thumbAssetServiceUrl", "https://cdnapi.kaltura.com");
mw.setConfig("Kaltura.playManifestServiceUrl", "https://cdnapi.kaltura.com");
mw.setConfig("Kaltura.ServiceBase", "/api_v3/index.php?service=");
mw.setConfig("Kaltura.CdnUrl", "https://cdnbakmi.kaltura.com");
mw.setConfig("Kaltura.StatsServiceUrl", "https://stats.kaltura.com");
mw.setConfig("Kaltura.LiveStatsServiceUrl", "https://livestats.kaltura.com");
mw.setConfig("Kaltura.AnalyticsUrl", "https://analytics.kaltura.com");
mw.setConfig("Kaltura.IframeRewrite", true);
mw.setConfig("EmbedPlayer.EnableIpadHTMLControls", true);
mw.setConfig("EmbedPlayer.UseFlashOnAndroid", true);
mw.setConfig("Kaltura.LoadScriptForVideoTags", true);
mw.setConfig("Kaltura.AllowIframeRemoteService", false);
mw.setConfig("Kaltura.UseAppleAdaptive", true);
mw.setConfig("Kaltura.EnableEmbedUiConfJs", false);
mw.setConfig("Kaltura.PageGoogleAnalytics", false);
mw.setConfig("Kaltura.SupressNonProductionUrlsWarning", "");
mw.setConfig("Kaltura.APITimeout", "10000");
mw.setConfig("Kaltura.kWidgetPsUrl", "https://cdnapi.kaltura.com/html5/html5lib/v2.97/../kwidget-ps/ps");
mw.setConfig("Kaltura.CacheTTL", "600000");
mw.setConfig("Kaltura.MaxCacheEntries", "1");
mw.setConfig("Kaltura.AllowedVars", "inlineScript");
mw.setConfig("Kaltura.AllowedVarsKeyPartials", "onPageJs,onPageCss,IframeCustomPluginJs,IframeCustomPluginCss");
mw.setConfig("Kaltura.AllowedPluginVars", "plugin,templatePath,templates,iframeHTML5Js,iframeHTML5Css,loadInIframe");
mw.setConfig("Kaltura.AllowedPluginVarsValPartials", "{html5ps}");
mw.setConfig("Kaltura.UserLanguage", []);
kWidget.addUserAgentRule("43052182", "/.*/", "leadWithHTML5");
kWidget.appendScriptUrls([], function () {
    window.kWidget.inLoaderUiConfJsCallback();
});
kWidget.uiConfScriptLoadList["43052182"] = 1;
kWidget.setup();

"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* exported config */
var config = {
  cache: {
    baseKeyName: "risefinancial"
  },
  firebase: {
    apiKey: "AIzaSyA8VXZwqhHx4qEtV5BcBNe41r7Ra0ZThfY",
    databaseURL: "https://fir-b3915.firebaseio.com"
  },
  financial: {
    realTimeURL: "https://contentfinancial2.appspot.com/data",
    historicalURL: "https://contentfinancial2.appspot.com/data/historical"
  }
};

var financialVersion = "2.1.5";
(function financial() {
  /* global Polymer, financialVersion, firebase, config */

  "use strict";

  var BQ_TABLE_NAME = "component_financial_events";

  var RiseFinancial = function () {
    function RiseFinancial() {
      _classCallCheck(this, RiseFinancial);
    }

    _createClass(RiseFinancial, [{
      key: "beforeRegister",
      value: function beforeRegister() {
        this.is = "rise-financial";

        /**
         * Fired when a response is received.
         *
         * @event rise-financial-response
         */

        /**
        * Fired when an error occurs and no cached data is available.
        *
        * @event rise-financial-no-data
        */

        this.properties = {
          /**
           * Type of data to fetch, either "realtime" or "historical".
           */
          type: {
            type: String,
            value: "realtime"
          },

          /**
           * Interval for which data should be retrieved.
           * Valid values are: Day, Week, 1M, 3M, 6M, 1Y, 5Y.
           */
          duration: {
            type: String,
            value: "1M"
          },

          /**
           * The optional usage type for Rise Vision logging purposes. Options are "standalone" or "widget"
           */
          usage: {
            type: String,
            value: ""
          },

          /**
           * ID of the financial list in Financial Selector.
           */
          financialList: {
            type: String,
            value: "",
            observer: "_financialReset"
          },

          /**
           * The list of instruments fields the component should return data for
           */
          instrumentFields: {
            type: Array,
            value: function value() {
              return [];
            }
          },

          /**
           * The id of the display running this instance of the component.
           */
          displayId: {
            type: String,
            readOnly: true,
            value: "preview"
          },

          /**
           * A single instrument symbol to return data for
           */
          symbol: {
            type: String,
            value: "",
            observer: "_financialReset"
          }

        };

        this._displayIdReceived = false;
        this._dataPingReceived = false;
        this._instrumentsReceived = false;
        this._goPending = false;
        this._instruments = [];
        this._refreshPending = false;
        this._initialGo = true;
        this._invalidSymbol = false;
        this._firebaseConnected = undefined;
        this._storageType = "session";
        this._isCacheRunning = false;
        this._baseCacheUrl = "https://localhost:9495";
      }

      /***************************************** HELPERS ********************************************/

    }, {
      key: "_isValidType",
      value: function _isValidType(type) {
        return type === "realtime" || type === "historical";
      }
    }, {
      key: "_isValidUsage",
      value: function _isValidUsage(usage) {
        return usage === "standalone" || usage === "widget";
      }
    }, {
      key: "_isValidDuration",
      value: function _isValidDuration(duration, type) {
        if (type.toLowerCase() === "historical") {
          // Parameters passed to financial server are case sensitive.
          return ["Day", "Week", "1M", "3M", "6M", "1Y", "5Y"].indexOf(duration) !== -1;
        } else {
          return true;
        }
      }
    }, {
      key: "_startTimer",
      value: function _startTimer() {
        var _this = this;

        this.debounce("refresh", function () {
          _this._refreshPending = true;
          _this.go();
        }, 60000);
      }
    }, {
      key: "_onDataPingReceived",
      value: function _onDataPingReceived(detail) {
        this._dataPingReceived = true;
        this._isCacheRunning = detail.isCacheRunning;
        this._baseCacheUrl = detail.baseCacheUrl;

        if (this._goPending) {
          this.go();
        }
      }
    }, {
      key: "_onDisplayIdReceived",
      value: function _onDisplayIdReceived(displayId) {
        this._displayIdReceived = true;

        if (displayId && typeof displayId === "string") {
          this._setDisplayId(displayId);
          this._storageType = "local";
        } else {
          this._storageType = "session";
        }

        if (this._goPending) {
          this.go();
        }
      }
    }, {
      key: "_log",
      value: function _log(params) {
        // only include usage_type if it's a valid usage value
        if (this._isValidUsage(this.usage)) {
          params.usage_type = this.usage;
        }

        params.version = financialVersion;

        this.$.logger.log(BQ_TABLE_NAME, params);
      }
    }, {
      key: "_getDataCacheKey",
      value: function _getDataCacheKey() {
        return config.cache.baseKeyName + "_" + this.type + "_" + this.displayId + "_" + this.financialList + "_" + this.duration + "_" + this.symbol;
      }

      /***************************************** FIREBASE *******************************************/

    }, {
      key: "_getInstrumentsFromLocalStorage",
      value: function _getInstrumentsFromLocalStorage(key, cb) {
        var instruments = null;

        try {
          instruments = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          console.warn(e.message);
        }

        cb(instruments);
      }
    }, {
      key: "_getInstruments",
      value: function _getInstruments() {
        var _this2 = this;

        if (!this.financialList || this._firebaseConnected === undefined) {
          return;
        }

        if (this._firebaseConnected) {
          this._instrumentsRef = firebase.database().ref("lists/" + this.financialList + "/instruments");
          this._handleInstruments = this._handleInstruments.bind(this);

          this._instrumentsRef.on("value", this._handleInstruments);
        } else {
          this._getInstrumentsFromLocalStorage("risefinancial_" + this.financialList, function (instruments) {
            if (instruments) {
              _this2._instrumentsReceived = true;
              _this2._instruments = instruments;

              if (_this2._goPending) {
                _this2.go();
              }
            } else {
              _this2.fire("rise-financial-no-data");
            }
          });
        }
      }
    }, {
      key: "_handleInstruments",
      value: function _handleInstruments(snapshot) {
        var instruments = snapshot.val() || {};

        this._instruments = sortInstruments(instruments);
        this._saveInstruments(this._instruments);
        this._instrumentsReceived = true;

        if (this._goPending) {
          this.go();
        }
      }
    }, {
      key: "_saveInstruments",
      value: function _saveInstruments(instruments) {
        try {
          localStorage.setItem("risefinancial_" + this.financialList, JSON.stringify(instruments));
        } catch (e) {
          console.warn(e.message);
        }
      }

      /***************************************** FINANCIAL ******************************************/

    }, {
      key: "_getParams",
      value: function _getParams(instruments, fields, callback) {

        return Object.assign({}, {
          id: this.displayId,
          code: this._getSymbols(instruments),
          tqx: "out:json;responseHandler:" + callback
        }, fields.length > 0 ? { tq: this._getQueryString(fields) } : null);
      }
    }, {
      key: "_getQueryString",
      value: function _getQueryString(fields) {
        if (fields.length === 0) {
          return "";
        }

        return "select " + fields.join(",");
      }
    }, {
      key: "_getData",
      value: function _getData(props, instruments, fields) {
        if (!this._isValidType(props.type) || !this._isValidDuration(props.duration, props.type)) {
          return;
        }

        var financial = this.$.financial;

        // set callback with the same value it was set on the responseHandler of the tqx parameter
        financial.callbackValue = btoa((this.id ? this.id : "") + this._getDataCacheKey()).substr(0, 10) + Math.random().toString().substring(2);

        var params = this._getParams(instruments, fields, financial.callbackValue);

        if (!this._invalidSymbol) {

          if (props.type === "realtime") {
            financial.url = config.financial.realTimeURL;
          } else {
            params.kind = props.duration;
            financial.url = config.financial.historicalURL;
          }

          financial.params = params;

          financial.riseCacheUrl = this._isCacheRunning ? this._baseCacheUrl + "/financials/?url=" : "";

          financial.generateRequest();
        }
      }
    }, {
      key: "_saveToStorage",
      value: function _saveToStorage(data) {

        for (var i = 0; i < data.instruments.length; i++) {
          data.instruments[i].id = data.instruments[i].$id;
          delete data.instruments[i].$id;
        }

        this.$.data.saveItem(this._getDataCacheKey(), data);
      }
    }, {
      key: "_getFromStorage",
      value: function _getFromStorage(callback) {

        this.$.data.getItem(this._getDataCacheKey(), function (cachedData) {
          if (cachedData) {

            for (var i = 0; i < cachedData.instruments.length; i++) {
              cachedData.instruments[i].$id = cachedData.instruments[i].id;
              delete cachedData.instruments[i].id;
            }

            callback(cachedData);
          } else {
            callback(null);
          }
        });
      }
    }, {
      key: "_handleData",
      value: function _handleData(e, resp) {
        var _this3 = this;

        var instruments = this._instruments;

        if (this.symbol && !this._invalidSymbol) {
          instruments = this._instruments.filter(function (obj) {
            return obj.symbol === _this3.symbol;
          });
        }

        var response = {
          instruments: instruments
        };

        if (resp && resp.table) {
          response.data = resp.table;
        }

        this._saveToStorage(response);

        this.fire("rise-financial-response", response);
        this._startTimer();
      }
    }, {
      key: "_handleError",
      value: function _handleError() {
        var _this4 = this;

        // error response provides no request or error message, use instruments to provide some detail instead
        var params = {
          event: "error",
          event_details: "Instrument List: " + JSON.stringify(this._instruments)
        };

        this._log(params);

        this._getFromStorage(function (cachedData) {
          if (cachedData) {
            _this4.fire("rise-financial-response", cachedData);
          } else if (!_this4._firebaseConnected) {
            try {
              var savedInstruments = JSON.parse(localStorage.getItem("risefinancial_" + _this4.financialList));

              _this4.fire("rise-financial-response", {
                instruments: savedInstruments
              });
            } catch (e) {
              _this4.fire("rise-financial-no-data");
            }
          } else {
            _this4.fire("rise-financial-no-data");
          }
        });

        this._startTimer();
      }
    }, {
      key: "_getSymbols",
      value: function _getSymbols(instruments) {
        var symbols = instruments.map(function (_ref) {
          var symbol = _ref.symbol;
          return symbol;
        });

        if (this.symbol) {
          if (symbols.indexOf(this.symbol) != -1) {
            return this.symbol;
          } else {
            this._invalidSymbol = true;
            this.fire("rise-financial-invalid-symbol");
            return "";
          }
        }

        return symbols.join("|");
      }
    }, {
      key: "ready",
      value: function ready() {
        var _this5 = this;

        var params = {
          event: "ready"
        };

        // ensure firebase app has not been initialized already
        if (!this._firebaseApp) {
          if (!firebase.apps.length) {
            this._firebaseApp = firebase.initializeApp(config.firebase);
          } else {
            this._firebaseApp = firebase.apps[0];
          }
        }

        // listen for data ping received
        this.$.data.addEventListener("rise-data-ping-received", function (e) {
          _this5._onDataPingReceived(e.detail);
        });

        // listen for logger display id received
        this.$.logger.addEventListener("rise-logger-display-id", function (e) {
          _this5._onDisplayIdReceived(e.detail);
        });

        this._log(params);
      }
    }, {
      key: "_financialReset",
      value: function _financialReset() {
        if (!this._firebaseApp) {
          return;
        }

        // ensure a go() call gets made when instruments handled via _handleInstruments()
        this._goPending = true;

        if (!this._initialGo) {
          this.cancelDebouncer("refresh");
          // make sure cached data isn't provided
          this._refreshPending = true;
        }

        this._getInstruments();
      }
    }, {
      key: "_handleConnected",
      value: function _handleConnected(snapshot) {
        var _this6 = this;

        if (!this._instrumentsReceived) {
          if (!snapshot.val()) {
            // account for multiple "false" values being initially returned even though network status is online
            if (!this.isDebouncerActive("connected")) {
              this.debounce("connected", function () {
                _this6._firebaseConnected = false;
                _this6._getInstruments();
              }, 2000);
            }
          } else {
            this.cancelDebouncer("connected");
            this._firebaseConnected = true;
            this._getInstruments();
          }
        }
      }
    }, {
      key: "attached",
      value: function attached() {
        this._connectedRef = firebase.database().ref(".info/connected");
        this._handleConnected = this._handleConnected.bind(this);
        this._connectedRef.on("value", this._handleConnected);
      }
    }, {
      key: "detached",
      value: function detached() {
        this._instrumentsRef.off("value", this._handleInstruments);
        this._connectedRef.off("value", this._handleConnected);
      }

      /**
       * Performs a request to obtain the financial data
       *
       */

    }, {
      key: "go",
      value: function go() {
        if (!this._displayIdReceived || !this._instrumentsReceived || !this._dataPingReceived) {
          this._goPending = true;
          return;
        }

        this._goPending = false;

        if (this._initialGo || this._refreshPending) {
          this._initialGo = false;
          this._refreshPending = false;

          // configure and execute request
          this._getData({
            type: this.type,
            duration: this.duration
          }, this._instruments, this.instrumentFields);

          return;
        }
      }
    }]);

    return RiseFinancial;
  }();

  Polymer(RiseFinancial);

  function sortInstruments(instrumentMap) {
    var list = Object.keys(instrumentMap).map(function ($id) {
      return Object.assign({ $id: $id }, instrumentMap[$id]);
    }).sort(function (i1, i2) {
      return _numberify(i1.order) - _numberify(i2.order);
    });

    return list;
  }

  function _numberify(x) {
    // if number is not defined or is invalid, assign the infinity
    // value to make sure the item stay at the bottom
    return Number.isInteger(x) ? x : Number.POSITIVE_INFINITY;
  }
})();
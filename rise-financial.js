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
    realTimeURL: "http://contentfinancial2.appspot.com/data",
    historicalURL: "http://contentfinancial2.appspot.com/data/historical"
  }
};

var financialVersion = "1.2.2";
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
            observer: "_financialListChanged"
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
          }

        };

        this._displayIdReceived = false;
        this._dataPingReceived = false;
        this._instrumentsReceived = false;
        this._goPending = false;
        this._instruments = {};
        this._refreshPending = false;
        this._initialGo = true;
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
      value: function _onDataPingReceived() {
        this._dataPingReceived = true;

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
        return config.cache.baseKeyName + "_" + this.type + "_" + this.displayId + "_" + this.financialList;
      }

      /***************************************** FIREBASE *******************************************/

    }, {
      key: "_getInstruments",
      value: function _getInstruments() {
        if (!this.financialList) {
          return;
        }

        this._instrumentsRef = firebase.database().ref("lists/" + this.financialList + "/instruments");
        this._handleInstruments = this._handleInstruments.bind(this);
        this._instrumentsRef.on("value", this._handleInstruments);
      }
    }, {
      key: "_handleInstruments",
      value: function _handleInstruments(snapshot) {
        var instruments = snapshot.val();

        this._instruments = instruments ? instruments : {};
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
      value: function _getParams(instruments, fields) {
        return Object.assign({}, {
          id: this.displayId,
          code: this._getSymbols(instruments),
          tqx: "out:json;responseHandler:callback"
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

        var financial = this.$.financial,
            params = this._getParams(instruments, fields);

        if (props.type === "realtime") {
          financial.url = config.financial.realTimeURL;
        } else {
          params.kind = props.duration;
          financial.url = config.financial.historicalURL;
        }

        financial.params = params;
      }
    }, {
      key: "_handleData",
      value: function _handleData(e, resp) {
        var response = {
          instruments: this._instruments
        };

        if (resp && resp.table) {
          response.data = resp.table;
        }

        this.$.data.saveItem(this._getDataCacheKey(), response);

        this.fire("rise-financial-response", response);
        this._startTimer();
      }
    }, {
      key: "_handleError",
      value: function _handleError() {
        var _this2 = this;

        // error response provides no request or error message, use instruments to provide some detail instead
        var params = {
          event: "error",
          event_details: "Instrument List: " + JSON.stringify(this._instruments)
        };

        this._log(params);

        this.$.data.getItem(this._getDataCacheKey(), function (cachedData) {
          if (cachedData) {
            _this2.fire("rise-financial-response", cachedData);
          } else {
            _this2.fire("rise-financial-no-data");
          }
        });

        this._startTimer();
      }
    }, {
      key: "_getSymbols",
      value: function _getSymbols(instruments) {
        var symbols = Object.keys(instruments).map(function (key) {
          return instruments[key].symbol;
        });

        return symbols.join("|");
      }
    }, {
      key: "ready",
      value: function ready() {
        var _this3 = this;

        var params = {
          event: "ready"
        };

        if (!this._firebaseApp) {
          this._firebaseApp = firebase.initializeApp(config.firebase);
        }

        // listen for data ping received
        this.$.data.addEventListener("rise-data-ping-received", function (e) {
          _this3._onDataPingReceived(e.detail);
        });

        // listen for logger display id received
        this.$.logger.addEventListener("rise-logger-display-id", function (e) {
          _this3._onDisplayIdReceived(e.detail);
        });

        this._log(params);
      }
    }, {
      key: "_financialListChanged",
      value: function _financialListChanged() {
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
      key: "attached",
      value: function attached() {
        this._getInstruments();
      }
    }, {
      key: "detached",
      value: function detached() {
        this._instrumentsRef.off("value", this._handleInstruments);
      }

      /**
       * Performs a request to obtain the financial data
       *
       */

    }, {
      key: "go",
      value: function go() {
        var _this4 = this;

        if (!this._displayIdReceived || !this._instrumentsReceived || !this._dataPingReceived) {
          this._goPending = true;
          return;
        }

        this._goPending = false;

        if (this._initialGo) {
          this._initialGo = false;

          // configure and execute initial request
          this._getData({
            type: this.type,
            duration: this.duration
          }, this._instruments, this.instrumentFields);

          return;
        }

        // execute new request when a refresh is pending
        if (this._refreshPending) {
          this._refreshPending = false;
          this.$.financial.generateRequest();

          return;
        }

        // provide cached data (if available)
        this.$.data.getItem(this._getDataCacheKey(), function (cachedData) {
          if (!cachedData) {
            _this4.$.financial.generateRequest();
          } else {
            _this4.fire("rise-financial-response", cachedData);
          }
        });
      }
    }]);

    return RiseFinancial;
  }();

  Polymer(RiseFinancial);
})();
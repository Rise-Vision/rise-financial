( function financial() {
  /* global Polymer, financialVersion, firebase, config */

  "use strict";

  var BQ_TABLE_NAME = "component_financial_events";

  class RiseFinancial {

    beforeRegister() {
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
          value: () => {
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
          value: ""
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
      this._firebaseConnected = true;
    }

    /***************************************** HELPERS ********************************************/

    _isValidType( type ) {
      return type === "realtime" || type === "historical";
    }

    _isValidUsage( usage ) {
      return usage === "standalone" || usage === "widget";
    }

    _isValidDuration( duration, type ) {
      if ( type.toLowerCase() === "historical" ) {
        // Parameters passed to financial server are case sensitive.
        return [ "Day", "Week", "1M", "3M", "6M", "1Y", "5Y" ].indexOf( duration ) !== -1;
      } else {
        return true;
      }
    }

    _startTimer() {
      this.debounce( "refresh", () => {
        this._refreshPending = true;
        this.go();
      }, 60000 );
    }

    _onDataPingReceived() {
      this._dataPingReceived = true;

      if ( this._goPending ) {
        this.go();
      }
    }

    _onDisplayIdReceived( displayId ) {
      this._displayIdReceived = true;

      if ( displayId && typeof displayId === "string" ) {
        this._setDisplayId( displayId );
      }

      if ( this._goPending ) {
        this.go();
      }
    }

    _log( params ) {
      // only include usage_type if it's a valid usage value
      if ( this._isValidUsage( this.usage ) ) {
        params.usage_type = this.usage;
      }

      params.version = financialVersion;

      this.$.logger.log( BQ_TABLE_NAME, params );
    }

    _getDataCacheKey() {
      return `${config.cache.baseKeyName}_${this.type}_${this.displayId}_${this.financialList}_${this.duration}_${this.symbol}`;
    }

    /***************************************** FIREBASE *******************************************/

    _getInstruments() {
      if ( !this.financialList ) {
        return;
      }

      this._instrumentsRef = firebase.database().ref( `lists/${ this.financialList }/instruments` );
      this._handleInstruments = this._handleInstruments.bind( this );

      this._instrumentsRef.on( "value", this._handleInstruments );
    }

    _handleInstruments( snapshot ) {
      const instruments = snapshot.val() || {};

      this._instruments = sortInstruments( instruments );
      this._saveInstruments( this._instruments );
      this._instrumentsReceived = true;

      if ( this._goPending ) {
        this.go();
      }
    }

    _saveInstruments( instruments ) {
      try {
        localStorage.setItem( `risefinancial_${ this.financialList }`, JSON.stringify( instruments ) );
      } catch ( e ) {
        console.warn( e.message );
      }
    }

    /***************************************** FINANCIAL ******************************************/

    _getParams( instruments, fields ) {
      let id = ( this.id ) ? this.id : "";

      return Object.assign( {},
        {
          id: this.displayId,
          code: this._getSymbols( instruments ),
          tqx: "out:json;responseHandler:callback" + id,
        },
        fields.length > 0 ? { tq: this._getQueryString( fields ) } : null );
    }

    _getQueryString( fields ) {
      if ( fields.length === 0 ) {
        return "";
      }

      return `select ${ fields.join( "," ) }`;
    }

    _getData( props, instruments, fields ) {
      if ( !this._isValidType( props.type ) || !this._isValidDuration( props.duration, props.type ) ) {
        return;
      }

      const financial = this.$.financial,
        params = this._getParams( instruments, fields );

      if ( !this._invalidSymbol ) {

        if ( props.type === "realtime" ) {
          financial.url = config.financial.realTimeURL;
        } else {
          params.kind = props.duration;
          financial.url = config.financial.historicalURL;
        }

        financial.params = params;

        financial.generateRequest();
      }
    }

    _saveToCache( data ) {

      for ( let i = 0; i < data.instruments.length; i++ ) {
        data.instruments[ i ].id = data.instruments[ i ].$id;
        delete data.instruments[ i ].$id;
      }

      this.$.data.saveItem( this._getDataCacheKey(), data );

    }

    _getFromCache( callback ) {

      this.$.data.getItem( this._getDataCacheKey(), ( cachedData ) => {
        if ( cachedData ) {

          for ( let i = 0; i < cachedData.instruments.length; i++ ) {
            cachedData.instruments[ i ].$id = cachedData.instruments[ i ].id;
            delete cachedData.instruments[ i ].id;
          }

          callback( cachedData );
        } else {
          callback( null );
        }
      } );
    }

    _handleData( e, resp ) {

      let instruments = this._instruments;

      if ( this.symbol && !this._invalidSymbol ) {
        instruments = this._instruments.filter( ( obj ) => {
          return obj.symbol === this.symbol;
        } );
      }

      const response = {
        instruments: instruments,
      };

      if ( resp && resp.table ) {
        response.data = resp.table;
      }

      this._saveToCache( response );

      this.fire( "rise-financial-response", response );
      this._startTimer();
    }

    _handleError() {
      // error response provides no request or error message, use instruments to provide some detail instead
      let params = {
        event: "error",
        event_details: `Instrument List: ${ JSON.stringify( this._instruments ) }`
      };

      this._log( params );

      this._getFromCache( ( cachedData ) => {
        if ( cachedData ) {
          this.fire( "rise-financial-response", cachedData );
        } else if ( !this._firebaseConnected ) {
          try {
            const savedInstruments = JSON.parse(
              localStorage.getItem( `risefinancial_${ this.financialList }` )
            );

            this.fire( "rise-financial-response", {
              instruments: savedInstruments
            } );
          } catch ( e ) {
            this.fire( "rise-financial-no-data" );
          }
        } else {
          this.fire( "rise-financial-no-data" );
        }
      } );

      this._startTimer();
    }

    _getSymbols( instruments ) {
      const symbols = instruments.map( ( { symbol } ) => symbol );

      if ( this.symbol ) {
        if ( symbols.indexOf( this.symbol ) != -1 ) {
          return this.symbol;
        } else {
          this._invalidSymbol = true;
          this.fire( "rise-financial-invalid-symbol" );
          return "";
        }
      }

      return symbols.join( "|" );
    }

    ready() {
      let params = {
          event: "ready"
        },
        connectedRef;

      // ensure firebase app has not been initialized already
      if ( !this._firebaseApp ) {
        if ( !firebase.apps.length ) {
          this._firebaseApp = firebase.initializeApp( config.firebase );
        } else {
          this._firebaseApp = firebase.apps[ 0 ];
        }
      }

      connectedRef = firebase.database().ref( ".info/connected" );
      connectedRef.on( "value", ( ( snap ) => {
        this._firebaseConnected = snap.val();
      } ).bind( this ) );

      // listen for data ping received
      this.$.data.addEventListener( "rise-data-ping-received", ( e ) => {
        this._onDataPingReceived( e.detail );
      } );

      // listen for logger display id received
      this.$.logger.addEventListener( "rise-logger-display-id", ( e ) => {
        this._onDisplayIdReceived( e.detail );
      } );

      this._log( params );
    }

    _financialListChanged() {
      if ( !this._firebaseApp ) {
        return;
      }

      // ensure a go() call gets made when instruments handled via _handleInstruments()
      this._goPending = true;

      if ( !this._initialGo ) {
        this.cancelDebouncer( "refresh" );
        // make sure cached data isn't provided
        this._refreshPending = true;
      }

      this._getInstruments();
    }

    attached() {
      this._getInstruments();
    }

    detached() {
      this._instrumentsRef.off( "value", this._handleInstruments );
    }

    /**
     * Performs a request to obtain the financial data
     *
     */
    go() {
      if ( !this._displayIdReceived || !this._instrumentsReceived || !this._dataPingReceived ) {
        this._goPending = true;
        return;
      }

      this._goPending = false;

      if ( this._initialGo || this._refreshPending ) {
        this._initialGo = false;
        this._refreshPending = false;

        // configure and execute request
        this._getData(
          {
            type: this.type,
            duration: this.duration,
          },
          this._instruments,
          this.instrumentFields
        );

        return;
      }

      // provide cached data (if available)
      this._getFromCache( ( cachedData ) => {
        if ( !cachedData ) {
          this._getData(
            {
              type: this.type,
              duration: this.duration,
            },
            this._instruments,
            this.instrumentFields
          );
        } else {
          this.fire( "rise-financial-response", cachedData );
        }
      } );
    }
  }

  Polymer( RiseFinancial );

  function sortInstruments( instrumentMap ) {
    const list = Object.keys( instrumentMap )
        .map( ( $id ) => Object.assign( { $id }, instrumentMap[ $id ] ) )
        .sort( ( i1, i2 ) => _numberify( i1.order ) - _numberify( i2.order ) );

    return list;
  }

  function _numberify( x ) {
    // if number is not defined or is invalid, assign the infinity
    // value to make sure the item stay at the bottom
    return Number.isInteger( x ) ? x : Number.POSITIVE_INFINITY;
  }

} )();

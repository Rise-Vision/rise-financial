/* exported firebase */
var firebase = {
  initializeApp: ( config ) => {
    return config;
  },
  apps : [],
  database: () => {
    return {
      ref: () => {
        return {
          on: ( key, cb ) => {
            if ( key !== "value" ) {
              return;
            }

            cb( {
              val: () => {
                return {
                  "AA?N": {
                    category: "Stocks",
                    index: 0,
                    name: "Alcoa",
                    symbol: "AA.N"
                  }
                }
              }
            } );
          }
        }
      }
    };
  }
};

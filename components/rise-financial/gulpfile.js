/* global require, process */

( function gulp( console ) {
  "use strict";

  const babel = require( "gulp-babel" ),
    bower = require( "gulp-bower" ),
    bump = require( "gulp-bump" ),
    del = require( "del" ),
    eslint = require( "gulp-eslint" ),
    env = process.env.NODE_ENV || "prod",
    file = require( "gulp-file" ),
    gulp = require( "gulp" ),
    rename = require( "gulp-rename" ),
    runSequence = require( "run-sequence" ),
    usemin = require( "gulp-usemin" ),
    wct = require( "web-component-tester" ).gulp.init( gulp ); // eslint-disable-line

  gulp.task( "clean-bower", ( cb ) => {
    del( [ "./bower_components/**" ], cb );
  } );

  gulp.task( "config", () => {
    return gulp.src( [ "./config/" + env + ".js" ] )
      .pipe( rename( "config.js" ) )
      .pipe( gulp.dest( "./config" ) );
  } );

  gulp.task( "lint", () => {
    return gulp.src( [ "./**/*.js", "./**/*.html" ] )
      .pipe( eslint() )
      .pipe( eslint.format() )
      .pipe( eslint.failAfterError() );
  } );

  gulp.task( "version", () => {
    let pkg = require( "./package.json" ),
      str = "let financialVersion = \"" + pkg.version + "\";";

    return file( "rise-financial-version.js", str, { src: true } )
      .pipe( gulp.dest( "./" ) );
  } );

  gulp.task( "source", () => {
    return gulp.src( "./rise-financial-es6.html" )
      .pipe( rename( "./rise-financial.html" ) )
      .pipe( usemin( {
        js: [ babel( {
          presets: [ "es2015" ],
          compact: false
        } ) ]
      } ) )
      .pipe( gulp.dest( "./" ) );
  } );

  // ***** Primary Tasks ***** //
  gulp.task( "bower-clean-install", [ "clean-bower" ], ( cb ) => {
    return bower().on( "error", ( err ) => {
      console.log( err );
      cb();
    } );
  } );

  gulp.task( "bump", () => {
    return gulp.src( [ "./package.json", "./bower.json" ] )
      .pipe( bump( { type: "patch" } ) )
      .pipe( gulp.dest( "./" ) );
  } );

  gulp.task( "test", [ "version", "config" ], ( cb ) => {
    runSequence( "test:local", cb );
  } );

  gulp.task( "build", [ "version" ], ( cb ) => {
    runSequence( "lint", "config", "source", cb );
  } );

  gulp.task( "default", [], () => {
    console.log( "********************************************************************".yellow );
    console.log( "  gulp bower-clean-install: delete and re-install bower components".yellow );
    console.log( "  gulp bump: increment the version".yellow );
    console.log( "  gulp test: run unit and integration tests".yellow );
    console.log( "  gulp build: build component".yellow );
    console.log( "********************************************************************".yellow );
    return true;
  } );

} )( console );

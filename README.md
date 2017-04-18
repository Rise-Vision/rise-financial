# Financial Web Component [![Circle CI](https://circleci.com/gh/Rise-Vision/rise-financial/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/rise-financial/tree/master)

## Introduction

`rise-financial` is a Polymer Web Component that works together with the [Rise Vision Financial Selector](https://selector.risevision.com/), a web app for managing financial content. It retrieves the financial list and its corresponding instruments from [Firebase](https://firebase.google.com/). Data is refreshed in realtime, so any changes that are made to a particular financial list in the Financial Selector are immediately propagated to the `rise-financial` component.

## Usage
To use `rise-financial`, you should first install it using Bower:
```
bower install https://github.com/Rise-Vision/rise-financial.git
```

Next, construct your HTML page. You should include `webcomponents-lite.min.js` before any code that touches the DOM, and load the web component using an [HTML import](http://webcomponents.org/articles/introduction-to-html-imports/).

### Example

```
<!DOCTYPE html>
<html>
  <head>
    <script src="bower_components/webcomponentsjs/webcomponents-lite.min.js"></script>
    <link rel="import" href="bower_components/rise-financial/rise-financial.html">
  </head>
  <body>
    <rise-financial
      id="myListID"
      financial-list="my-list"
      instrument-fields='["instrument", "name", "lastPrice", "netChange"]'>
    </rise-financial>

    <script>
      // Listen for "WebComponentsReady" event.
      window.addEventListener( "WebComponentsReady", function( e ) {
        const financial = document.querySelector( "rise-financial" );

        financial.addEventListener( "rise-financial-response", ( e ) => {
          console.log( e.detail );
        } );

        financial.addEventListener( "rise-financial-no-data", ( e ) => {
          console.log( "No data available" );
        } );

        // Request the financial data.
        financial.go();
      });
    </script>
  </body>
</html>
```

### Realtime Data
To request realtime data, the `type` attribute can either be left off or it can be set to `realtime`.

Valid values for the `instrument-fields` attribute for realtime data are: `accumulatedVolume`, `ask`, `bid`, `code`, `dayHigh`, `dayLow`, `daysOfWeek`, `endTime`, `historicClose`, `instrument`, `lastPrice`, `name`, `netChange`, `percentChange`, `startTime`, `timeZone`, `timeZoneOffset`, `tradeTime`, `updateInterval`, `yearHigh`, `yearLow`, `yield` `logoURL` and `yieldChange`.

If no `instrument-fields` attribute is provided, all fields are returned by default.

#### Example

```
<rise-financial
  financial-list="my-list"
  instrument-fields='["instrument", "name"]'>
</rise-financial>
```

### Historical Data
To request historical data, the `type` attribute must be set to `historical` and `duration` must be set to one of: `Day`, `Week`, `1M`, `3M`, `6M`, `1Y` or `5Y`.

Valid values for the `instrument-fields` attribute for historical data are: `accumulatedVolume`, `closePrice`, `intervalVolume`, `percentChange` and `tradeTime`.

If no `instrument-fields` attribute is provided, all fields are returned by default.

In case the list of instruments contains more than one instrument an attribute `symbol` can be set to specify which instrument from the list the historical data needs to be retrieved.

#### Example

```
<rise-financial
  id = "myHistoricalID"
  duration="1M"
  financial-list="my-list"
  instrument-fields='["closePrice", "percentChange"]'
  type="historical"
  symbol="AAPL.O">
</rise-financial>
```

### Response Object

`rise-financial` returns an object of the following format:

![rise-financial data](https://cloud.githubusercontent.com/assets/1190420/21622351/1b53131c-d1cb-11e6-8ae3-2d1e2fb9049d.png)

_data_ is an object with _cols_ and _rows_ properties, where _cols_ is an array that contains additional information about the requested fields, and _rows_ is an array that contains the actual data.

_instruments_ is an object that provides details about every instrument found in the financial list.

## Documentation
For further documentation on `rise-financial` attributes, methods, usage, and a comprehensive demo, please see [here](http://rise-vision.github.io/rise-financial).

## Built With
- [Polymer](https://www.polymer-project.org/)
- [npm](https://www.npmjs.org)
- [Bower](http://bower.io/)
- [Gulp](http://gulpjs.com/)
- [Polyserve](https://www.npmjs.com/package/polyserve)
- [Firebase Realtime Database JavaScript SDK](https://firebase.google.com/docs/database/web/start)
- [web-component-tester](https://github.com/Polymer/web-component-tester) for testing

## Development

### Dependencies
* [Git](http://git-scm.com/) - Git is a free and open source distributed version control system that is used to manage our source code on Github.
* [npm](https://www.npmjs.org/) & [Node.js](http://nodejs.org/) - npm is the default package manager for Node.js. npm runs through the command line and manages dependencies for an application. These dependencies are listed in the _package.json_ file.
* [Bower](http://bower.io/) - Bower is a package manager for Javascript libraries and frameworks. All third-party Javascript dependencies are listed in the _bower.json_ file.
* [Gulp](http://gulpjs.com/) - Gulp is a Javascript task runner. It lints, runs unit and E2E (end-to-end) tests, minimizes files, etc. Gulp tasks are defined in _gulpfile.js_.
* [Polyserve](https://www.npmjs.com/package/polyserve) - A simple web server for using bower components locally.

### Local Development Environment Setup and Installation
To make changes to the web component, you'll first need to install the dependencies:

- [Git](http://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js and npm](http://blog.nodeknockout.com/post/65463770933/how-to-install-node-js-and-npm)
- [Bower](http://bower.io/#install-bower) - To install Bower, run the following command in Terminal: `npm install -g bower`. Should you encounter any errors, try running the following command instead: `sudo npm install -g bower`.
- [Gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) - To install Gulp, run the following command in Terminal: `npm install -g gulp`. Should you encounter any errors, try running the following command instead: `sudo npm install -g gulp`.
- [Polyserve](https://www.npmjs.com/package/polyserve) - To install Polyserve, run the following command in Terminal: `npm install -g polyserve`. Should you encounter any errors, try running the following command instead: `sudo npm install -g polyserve`.

The web components can now be installed by executing the following commands in Terminal:
```
git clone https://github.com/Rise-Vision/rise-financial.git
cd rise-financial
npm install
bower install
```

### Run Locally
To access the demo locally, run the following command in Terminal: `polyserve`

Now in your browser, navigate to:

```
localhost:8080/components/rise-financial/demo/index.html
```

### Testing
You can run the suite of tests either by command terminal or via a local web server using Polyserve.

#### Command Terminal
Execute the following command in Terminal to run tests:

```
NODE_ENV=test yarn run test
```

#### Local Server
Run the following command in Terminal: `polyserve`.

Now in your browser, navigate to:

```
localhost:8080/components/rise-financial/test/index.html
```

### Deployment
Once you are satisifed with your changes, deploy the contents of the `bower_components` folder to a folder on your server and also create a `rise-financial` folder within your folder and upload `rise-financial.html` to it. You can then use the web component by following the *Usage* instructions.

## Submitting Issues
If you encounter problems or find defects we really want to hear about them. If you could take the time to add them as issues to this Repository it would be most appreciated. When reporting issues, please use the following format where applicable:

**Reproduction Steps**

1. did this
2. then that
3. followed by this (screenshots / video captures always help)

**Expected Results**

What you expected to happen.

**Actual Results**

What actually happened. (screenshots / video captures always help)

## Contributing
All contributions are greatly appreciated and welcome! If you would first like to sound out your contribution ideas, please post your thoughts to our [community](http://community.risevision.com), otherwise submit a pull request and we will do our best to incorporate it. Please be sure to submit test cases with your code changes where appropriate.

## Resources
If you have any questions or problems, please don't hesitate to join our lively and responsive community at http://community.risevision.com.

If you are looking for user documentation on Rise Vision, please see https://help.risevision.com/user.

If you would like more information on developing applications for Rise Vision, please visit https://help.risevision.com/developer.

**Facilitator**

[Stuart Lees](https://github.com/stulees "Stuart Lees")

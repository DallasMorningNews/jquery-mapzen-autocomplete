## This plugin is no longer maintained (we're back to using the Google Maps API).

# `jquery-opencage-autocomplete`

This is a jQuery address autocomplete widget that uses OpenCage's [geocoding API](https://geocoder.opencagedata.com/api). It's ripped from the `voter-guide`'s home page.

**This is probably still a little crude, and you'll likely need to adjust styles and behavior for your own usage.**

The goal of this widget is to provide both address geocoding and typeahead functionality for an input field
that increases geocoding accuracy by providing address results as the user types:

![autocomplete](/etc/autocomplete.gif?raw=true)

It also supports using the user's device location and passing it off to OpenCage's reverse geocoding API to turn the user's device location into an address:

![autocomplete](/etc/device-location.gif?raw=true)

## Installation

```sh
$ npm i -S DallasMorningNews/jquery-opencage-autocomplete
```

You'll need to install this into a project that has tooling to transpile the ES2015-style JavaScript in the main scripts file, such as a project built using our Yeoman generator.

## Usage

1. Add an `<input>` to your markup:

    ```html
    <input id="address" placeholder="Type an address here"></input>
    ```
2. Add the widget's styles to your project:

    ```css
    @import 'path/to/node_modules/jquery-opencage-autocomplete/jquery-opencage-autocomplete';
    ```

3. Initialize the plugin on your `<input>` element, passing down any configuration:

    ```js
    import $ from 'jquery';
    import 'jquery-opencage-autocomplete';

    $('#address').opencageAutocomplete({
      // Don't start geolocating until 5 characters have been entered (default)
      minCharacters: 5,
      // Offer to use the user's device location (default)
      deviceLocation: true,
      // You can also pass down any parameters that the OpenCage geocoding API takes:
      apiParams: {
        key: 'xxx',
        bounds: [
          raceExtent.sw[1],  // lng
          raceExtent.sw[0],  // lat
          raceExtent.ne[1],  // lng
          raceExtent.ne[0],  // lat
        ].join(','),
        countrycode: 'us',
        // etc. ...
      },,
    });

    // Fires when an address has been selected; returns a single
    // GeoJSON feature with a point that is the result
    $('#address').on('opencage:selected', (evt, results, accuracy) => {
      console.log(results);
      console.log(accuracy); // accuracy, in meters; either from the device's GPS or based on OpenCage's confidence level
    });

    // Fired every time API querying begins
    $('#address').on('opencage:searching-started', () => {
      console.log('Starting autocompete queries');
    });

    // Fired when all API queries have finished (not just when one has returned results)
    $('#address').on('opencage:searching-finished', () => {
      console.log('Finished trying to autocomplete');
    });

    // Fired on API errors
    $('#address').on('opencage:error', (evt, err) => {
      console.error(err);
    });
    ```

## Copyright

&copy; 2018 The Dallas Morning News

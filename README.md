**DEPRECATED: Mapzen is [no more](https://mapzen.com/blog/shutdown/), so we're no longer maintaining this plug-in. We may bring it back to life with a different geocoder someday (see [#2](https://github.com/DallasMorningNews/jquery-mapzen-autocomplete/issues/2)), but for now you should avoid this and seek another solution.**

# `jquery-mapzen-autocomplete`

This is a jQuery address autocomplete widget that uses Mapzen's [search API](https://mapzen.com/documentation/search/search/). It's ripped from the `voter-guide`'s home page.

**This is probably still a little crude, and you'll likely need to adjust styles and behavior for your own usage.**

The goal of this widget is to provide both address geocoding and typeahead functionality for an input field
that increases geocoding accuracy by providing address results as the user types:

![autocomplete](/etc/autocomplete.gif?raw=true)

It also supports using the user's device location and passing it off to Mapzen's reverse geocoding API to turn the user's device location into an address:

![autocomplete](/etc/device-location.gif?raw=true)

## Installation

```sh
$ npm i -S DallasMorningNews/jquery-mapzen-autocomplete
```

You'll need to install this into a project that has tooling to transpile the ES2015-style JavaScript in the main scripts file, such as a project built using our Yeoman generator.

## Usage

1. Add an `<input>` to your markup:

    ```html
    <input id="address" placeholder="Type an address here"></input>
    ```
2. Add the widget's styles to your project:

    ```css
    @import 'path/to/node_modules/jquery-mapzen-autocomplete/jquery-mapzen-autocomplete';
    ```

3. Initialize the plugin on your `<input>` element, passing down any configuration:

    ```js
    import $ from 'jquery';
    import 'jquery-mapzen-autocomplete';

    $('#address').mapzenAutocomplete({
      // Don't start geolocating until 5 characters have been entered (default)
      minCharacters: 5,
      // Offer to use the user's device location (default)
      deviceLocation: true,
      // You can also pass down any parameters that the Mapzen search API takes:
      mapzenOpts: {
        // Required
        api_key: 'mapzen-xxxxxx',

        // * Ex: Only return street addresses, not places
        sources: 'openaddresses',
        // * Ex: Limit the query to Dallas
        'boundary.rect.min_lat': 32.5452140003259,
        'boundary.rect.min_lon': -97.0004886135383,
        'boundary.rect.max_lat': 33.0238153832828,
        'boundary.rect.max_lon': -96.4636715023346,
      },
    });

    // Fires when an address has been selected; returns a single
    // GeoJSON feature with a point that is the result
    $('#address').on('mapzen:selected', (evt, results, accuracy) => {
      console.log(results);
      console.log(accuracy); // set if location was obtained from user's device location; in feet
    });

    // Fired every time API querying begins
    $('#address').on('mapzen:searching-started', () => {
      console.log('Starting autocompete queries');
    });

    // Fired when all API queries have finished (not just when one has returned results)
    $('#address').on('mapzen:searching-finished', () => {
      console.log('Finished trying to autocomplete');
    });

    // Fired on API errors
    $('#address').on('mapzen:error', (evt, err) => {
      console.error(err);
    });
    ```

## Copyright

&copy; 2017 The Dallas Morning News

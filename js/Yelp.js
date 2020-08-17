/**
  * @desc Core class which is, at its foundation, based on Google Maps' Places Search Box sample:
  * https://developers.google.com/maps/documentation/javascript/examples/places-searchbox
  *
  * All restaurant searches use Yelp's Search API v2.
  *
  * @author Alain Limoges alain.limoges@gmail.com
*/
var YelpEngine = (function() {

  // Modular variables.
  var map = null;                                                           // Google Maps instance.
  var markers = [];                                                         // Collection of markers on map.
  var infowindow = new google.maps.InfoWindow();                            // Create a single infowindow instance.
  var isMobile = (navigator.userAgent.match(/Mobi/));                       // Check if user is on a mobile device.
  var defaultIcon = 'http://google.com/mapfiles/ms/micons/red-dot.png';     // Marker on map.
  var activeIcon = 'http://google.com/mapfiles/ms/micons/yellow-dot.png';   // Active marker on map.
  var disableHover = false;                                                 // Marker pop-up on hover is active by default.

  // "toastr" is a non-obtrusive alerts plug-in.
  toastr.options = {
    "positionClass": "toast-bottom-center",
    "timeOut": "3000"
  };

  /**
    * @desc Initialize map to center of the West-End neighborhood, in Vancouver, Canada.
  */
  var init = function() {
    var westEnd = new google.maps.LatLng(49.2851117,-123.1338859);

    map = new google.maps.Map(document.getElementById('map-canvas'), {
      center: westEnd,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    setupSearchBox();
  };

  /**
    * @desc Copy of functionality found on Google Maps Places search box sample (link in file header).
  */
  var setupSearchBox = function() {
    var searchBoxMarkers = [];

    // Create the search box and link it to the UI element.
    var input = /** @type {HTMLInputElement} */(
        document.getElementById('pac-input'));
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    var searchBox = new google.maps.places.SearchBox(
      /** @type {HTMLInputElement} */(input));

    // [START region_getplaces]
    // Listen for the event fired when the user selects an item from the
    // pick list. Retrieve the matching places for that item.
    google.maps.event.addListener(searchBox, 'places_changed', function() {
      var places = searchBox.getPlaces();

      if (places.length === 0) {
        return;
      }
      for (var i = 0, marker; marker = searchBoxMarkers[i]; i++) {
        marker.setMap(null);
      }

      // For each place, get the icon, place name, and location.
      var bounds = new google.maps.LatLngBounds();
      for (var i = 0, place; place = places[i]; i++) {
        // Create a marker for each place.
        var marker = new google.maps.Marker({
          map: map,
          icon: getImage(place.icon),
          title: place.name,
          position: place.geometry.location
        });

        searchBoxMarkers.push(marker);

        bounds.extend(place.geometry.location);
      }

      map.fitBounds(bounds);
    });
    // [END region_getplaces]

    // Bias the SearchBox results towards places that are within the bounds of the
    // current map's viewport.
    google.maps.event.addListener(map, 'bounds_changed', function() {
      var bounds = map.getBounds();
      searchBox.setBounds(bounds);
    });
  };

  /**
    * @desc Main search call. We query the Yelp Search API for restaurants according to
    * the search criteria passed as parameters. Results are rendered as markers on the map
    * and as a sorted list accessible via a button click.
    *
    * @param string category - Restaurant category to be searched
    * @param int radius - Radius to be covered, FROM THE CENTER OF THE MAP, by Yelp's Search API
    * @param int sort - Sort order to use with Yelp's Search API
    *
    * @thanks OAuth code - http://forums.asp.net/t/1801674.aspx?how+to+create+API+URL+using+some+credentials
  */
  var searchNearbyRestaurants = function(category, radius, sort) {
    if (map !== null) {
      clearRestaurants(); // Always clear any existing markers from the map before querying for a new set of restaurants.

      // OAuth credentials for Yelp Search API.
      var auth = {
        consumerKey: "[YOUR_OAUTH_CONSUMER_KEY]",
        consumerSecret: "[YOUR_OAUTH_CONSUMER_SECRET]",
        accessToken: "[YOUR_OAUTH_ACCESS_TOKEN]",
        accessTokenSecret: "[YOUR_OAUTH_ACCESS_TOKEN_SECRET]",
        serviceProvider: {
          signatureMethod: "HMAC-SHA1"
        }
      };
      var accessor = {
        consumerSecret: auth.consumerSecret,
        tokenSecret: auth.accessTokenSecret
      };

      // Prepare list of parameters to be used by the Yelp Search API (search criteria + OAuth credentials).
      var currentLocation = map.getCenter();
      parameters = [];
      parameters.push(['category_filter', category]);
      parameters.push(['radius_filter', radius]);
      parameters.push(['sort', sort]);
      parameters.push(['ll', currentLocation.G + "," + currentLocation.K]);
      parameters.push(['callback', 'cb']);
      parameters.push(['oauth_consumer_key', auth.consumerKey]);
      parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
      parameters.push(['oauth_token', auth.accessToken]);
      parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
      var message = {
        'action': 'http://api.yelp.com/v2/search',
        'method': 'GET',
        'parameters': parameters
      };
      OAuth.setTimestampAndNonce(message);
      OAuth.SignatureMethod.sign(message, accessor);
      var parameterMap = OAuth.getParameterMap(message.parameters);
      parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);

      // Make asynchronous call to Yelp Search API.
      $.ajax({
        'url': message.action,
        'data': parameterMap,
        'cache': true,
        'dataType': 'jsonp',
        'jsonpCallback': 'cb',
        'success': function(data) {
          populateRestaurants(data.businesses);
        },
        'error' : function(error) {
          toastr.error('Yelp search failed (' + error.status + ' ' + error.statusText + ').');
        }
      });
    }
  };

  /**
    * @desc Wrapper function that renders both the map markers and sorted list.
    * @param array businesses - List of businesses returned by Yelp's Search API
  */
  var populateRestaurants = function(businesses) {

    disableHover = false;
    var listItems = "";
    var businessesCount = businesses.length;

    if (businessesCount > 0) {
      for (var i = 0; i < businessesCount; i++) {
        var business = businesses[i];

        // Map out only businesses that are still well, in business...
        // Note: "is_closed" does NOT refer to the restaurant's business hours... Too bad, would be nice to have that too.
        // ref: https://groups.google.com/forum/#!topic/yelp-developer-support/IiZnJ8F2m1A
        if (!business.is_closed) {
          addMapMarker(business, i);                      // Add marker to map.
          listItems += populateListItem(business, i);     // Add one list item to modal list view.
        }
      }
    }
    else {
      toastr.warning("Search returned no results.");
      listItems += "Search returned no results.";
    }

    // Populate modal window with full set of restaurant/list items (hidden until button click for list view).
    $(".modal-body").html('<div class="list-group">' + listItems + '</div>');
  };

  /**
    * @desc Dynamically construct one restaurant list item as per a set HTML template.
    * @param object business - Yelp Search API business
    * @param array listIndex - Current list item index being processed (zero-based)
    * @return string - HTML block representing one list item in a modal list view.
  */
  var populateListItem = function(business, listIndex) {

    // Template format sample:
    //
    // 1. Restaurant Good Food
    // Category1, Category2
    // ***** 45 reviews
    // 123 Some St. (100m)
    //
    var listItemTemplate = '<a href="#" class="list-group-item">{listIndex}. <strong>{bizName}</strong><br><small>{bizCategories}<br><img src="{bizRatingImg}" alt="{bizRating} stars" />&nbsp;{bizReviewCount} reviews<br>{bizAddress} ({bizDistance}m)</small></a>';

    return listItemTemplate
      .replace("{listIndex}", listIndex + 1)
      .replace("{bizName}", business.name)
      .replace("{bizDistance}", Math.floor(business.distance))
      .replace("{bizCategories}", getBusinessCategories(business))
      .split("{bizRating}").join(business.rating)
      .replace("{bizRatingImg}", business.rating_img_url_small)
      .replace("{bizReviewCount}", business.review_count)
      .replace("{bizAddress}", getBusinessAddress(business));
  };

  /**
    * @desc Dynamically construct a Google Maps marker's infowindow content as per a set HTML template.
    * @param object business - Yelp Search API business
    * @return string - HTML block representing a map marker's infowindow custom content.
    *
    * @thanks Split/Join "replace all" hack - http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
  */
  var populateInfoWindow = function(business) {

    var infoWindowTemplate = '<a href="{bizUrl}"><strong>{bizName}</strong></a><br>{bizCategories}<br><img src="{bizRatingImg}" alt="{bizRating}" />&nbsp;{bizReviewCount} reviews<br>{bizAddress} ({bizDistance}m)<br><a href="tel:{bizPhone}">{bizPhone}</a>';

    return infoWindowTemplate
      .split("{bizName}").join(business.name)
      .replace("{bizDistance}", Math.floor(business.distance))
      .replace("{bizCategories}", getBusinessCategories(business))
      .replace("{bizRatingImg}", business.rating_img_url)
      .replace("{bizRating}", business.rating)
      .replace("{bizReviewCount}", business.review_count)
      .replace("{bizAddress}", getBusinessAddress(business))
      .split("{bizPhone}").join(business.display_phone)
      .replace("{bizUrl}", getBusinessUrl(business));
  };

  /**
    * @desc Helper function to format the address nicely.
    * @param object business - Yelp Search API business
    * @return string - user-friendly address
  */
  var getBusinessAddress = function(business) {
    return business.location.address + ', ' + business.location.city;
  };

  /**
    * @desc Helper function to use proper url (mobile or desktop version).
    * @param object business - Yelp Search API business
    * @return string - Mobile or desktop friendly url
  */
  var getBusinessUrl = function(business) {
    return (isMobile ? business.mobile_url : business.url);
  };

  /**
    * @desc Helper function to display the categories under which a restaurant is listed.
    * @param object business - Yelp Search API business
    * @return string - Comma separated list of categories
  */
  var getBusinessCategories = function(business) {
    if (business.categories !== null) {
      var categoriesCount = business.categories.length;
      var categories = "";

      for (var i = 0; i < categoriesCount; i++)
        categories += business.categories[i][0] + ", ";

      // Remove trailing ", ".
      categories = categories.slice(0, -2);

      return "<em>" + categories + "</em>";
    }

    return "";
  };

  /**
    * @desc Clear the listview and markers from the map.
  */
  var clearRestaurants = function() {
    $(".modal-body").html("");              // Clear the modal list view.
    var resultsCount = markers.length;      // Clear the markers on the map.
    for (var i = 0; i < resultsCount; i++)
        markers[i].setMap(null);
    markers = [];                           // Clear the markers array.
  };


  /**
    * @desc Add a marker to the map and associate user-friendly events to it.
    * @param object business - Yelp Search API business
    * @param int index - Current index at which we're at in Yelp's Search API result set.
  */
  var addMapMarker = function(business, index) {
    var latLng = new google.maps.LatLng(
      business.location.coordinate.latitude,
      business.location.coordinate.longitude);

    // Create a marker and add a few custom properties to it.
    var marker = new google.maps.Marker({
      map: map,
      icon: defaultIcon,
      position: latLng,
      title: business.name,
      index: index,           // Keep track of which index this marker refers to in the modular "markers" array.
      business: business      // Store the business info for later use with the infowindow.
    });

    // Add marker to modular "markers" array.
    markers.push(marker);

    /*************************
    Marker / Infowindow Events
    *************************/

    // Show a map marker's infowindow automagically when the user hovers over it.
    google.maps.event.addListener(marker, 'mouseover', function() {
      if (!disableHover)
        setActiveMarker(marker.index);
    });

    // Hide a map marker's infowindow automagically when the user moves the mouse cursor out of it.
    google.maps.event.addListener(marker, 'mouseout', function() {
      if (!disableHover)
        closeActiveMarker(marker.index);
    });

    // Show a map marker's infowindow when the user clicks on it.
    google.maps.event.addListener(marker, 'click', function() {

      // Saving a few milliseconds here...
      // if "disableHover" = false --> marker info window already showing (from 'mouseover' event).
      //    No need to show it again
      // if "disableHover" = true --> a (potentially) different marker was previously clicked.
      //    We can update the active marker.
      if (disableHover) {
        setDefaultIcon();               // Clear out any previously clicked/active marker, if any.
        setActiveMarker(marker.index);
      }

      // Temporarily disable mouse hover feature in that scenario as the user
      // clearly wants to look at a certain restaurant more thoroughly at this moment...
      disableHover = true;
    });

    // Mouse hover feature is re-enabled once the user closes an infowindow.
    google.maps.event.addListener(infowindow, 'closeclick', function() {
      setDefaultIcon();
      disableHover = false;
    });
  };

  /**
    * @desc Set the active marker on the map and pop-up its infowindow automagically.
    * @param int index - Index within Yelp's Search API result set we wish to pull information from.
  */
  var setActiveMarker = function(index) {
    setActiveIcon(index);
    openInfoWindow(index);
  };

  /**
    * @desc Close the active infowindow and put marker out of "active" status (i.e. remove yellow marker)
    * @param int index - Index within Yelp's Search API result set we wish to pull information from.
  */
  var closeActiveMarker = function(index) {
    closeInfoWindow();
    setDefaultIcon(index);
  };

  /**
    * @desc Set the active marker icon on the map.
    * @param int index - Index within Yelp's Search API result set we wish to pull information from.
  */
  var setActiveIcon = function(index) {
    if (markers[index] !== undefined) {
      markers[index].setIcon(activeIcon);
    }
  };

  /**
    * @desc Set the default marker icon on the map.
    * @param int index - Index within Yelp's Search API result set we wish to pull information from.
  */
  var setDefaultIcon = function(index) {
    if (index !== undefined && markers[index] !== undefined) {
      markers[index].setIcon(defaultIcon);
    }
    else if (markers !== undefined) {
      var markersCount = markers.length;

      for (var i = 0; i < markersCount; i++)
        markers[i].setIcon(defaultIcon);
    }
  };

  /**
    * @desc Show a marker's infowindow.
    * @param int index - Index within Yelp's Search API result set we wish to pull information from.
  */
  var openInfoWindow = function(index) {
    if (markers[index] !== undefined) {
      infowindow.setContent(populateInfoWindow(markers[index].business));
      infowindow.open(map, markers[index]);
    }
  };

  /**
    * @desc Close a marker's infowindow.
  */
  var closeInfoWindow = function() {
    infowindow.close();
  };

  /**
    * @desc Get a scalable image/icon.
    * @param string icon - URL for the image/icon to scale
    * @return Google Maps compatible image/icon object
  */
  var getImage = function(icon) {
    return {
      url: icon,
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(25, 25)
    };
  };

  /**
    * @desc Initialize access to the list view mode.
  */
  var initializeListViewMode = function() {
    closeActiveMarker();     // Close any active marker.
    disableHover = true;  // Disable marker hover functionality while in modal list view mode.
  };

  /**
    * @desc Process when user elects to not select any restaurant in modal list view mode.
  */
  var cancelListViewMode = function() {
    disableHover = false;
  };

  /**
    * @desc List of publicly accessible Yelp Search API based calls.
  */
  return {
    initialize: init,
    searchNearbyRestaurants: searchNearbyRestaurants,
    setActiveMarker: setActiveMarker,
    closeActiveMarker: closeActiveMarker,
    initializeListViewMode: initializeListViewMode,
    cancelListViewMode: cancelListViewMode
  };
})();
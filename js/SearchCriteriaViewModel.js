var SearchCriteriaViewModel = function() {
  var self = this;

  /* Subset of Yelp Search API compatible restaurant categories (there are hundreds). */
  self.categories = ko.observableArray([
    { id: 'restaurants', desc: 'Restaurants' },
    { id: 'gluten_free', desc: 'Gluten free' },
    { id: 'italian', desc: 'Italian' },
    { id: 'japanese', desc: 'Japanese' },
    { id: 'korean', desc: 'Korean' },
    { id: 'pizza', desc: 'Pizza' },
    { id: 'poutineries', desc: 'Poutinerie' },
    { id: 'sushi', desc: 'Sushi bars' },
    { id: 'thai', desc: 'Thai' },
    { id: 'vegan', desc: 'Vegan' },
    { id: 'vegetarian', desc: 'Vegetarian' }
  ]);

  /* Arbitrary list of distances that I consider to be "near" enough. Some are near enough
     for pedestrians; distances 1km+ are more for peole who might have access to a car. */
  self.radiuses = [
    { distance: 100, desc: '100m' },
    { distance: 250, desc: '250m' },
    { distance: 500, desc: '500m' },
    { distance: 1000, desc: '1km' },
    { distance: 2000, desc: '2km' },
    { distance: 5000, desc: '5km' },
    { distance: 10000, desc: '10km' },
    { distance: 15000, desc: '15km' },
    { distance: 20000, desc: '20km' },
    { distance: 25000, desc: '25km' }
  ];

  /* Sort orders available with the Yelp Search API. */
  self.sorts = [
    { sort: 0, desc: 'Best matched'},
    { sort: 1, desc: 'Closest'},
    { sort: 2, desc: 'Highest rated'}
  ];


  // Set initial search category and radius, in meters and make a first query to the Yelp Search API.
  self.category = ko.observable('restaurants');
  self.radius = ko.observable(500);
  self.sort = ko.observable(2);

  YelpEngine.searchNearbyRestaurants(self.category(), self.radius(), self.sort());


  // Computed, user-friendly sort description for use with restaurants modal pop-up.
  self.sortDescription = ko.computed(function() {

      switch(self.sort()) {
        case 0:
          return "Best matched";
        case 1:
          return "Closest";
        default:
          return "Highest rated";
      }
  }, self);


  // Subscriptions (a.k.a "onChange" events for the dropdowns).
  self.category.subscribe(function(newValue) {
     YelpEngine.searchNearbyRestaurants(newValue, self.radius(), self.sort());
  }, this);

  self.radius.subscribe(function(newValue) {
     YelpEngine.searchNearbyRestaurants(self.category(), newValue, self.sort());
  }, this);

  self.sort.subscribe(function(newValue) {
     YelpEngine.searchNearbyRestaurants(self.category(), self.radius(), newValue);
  }, this);
};

ko.applyBindings(new SearchCriteriaViewModel());
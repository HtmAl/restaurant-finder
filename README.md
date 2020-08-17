# Restaurant Finder
This site uses the Yelp Search API and Google Maps to help you find the best restaurants available in your immediate vicinity.


## Navigating to the website

1. Go to http://htmal.github.io/restaurant-finder/

An initial search of all the restaurants Yelp can find within 500m (limit of 40 results) will be automatically done for you.


## How to search for restaurants

1. Using the search criteria dropdowns
There are three dropdowns to help you search for restaurants:
..1. Sort order (default "Highest rated")
..2. Type of restaurant (default "All restaurants")
..3. Search radius (default "500m")

Use whatever combination of search criteria you like to find the restaurant you're looking for. All changes to the search criteria will immediately be reflected on the map.

NOTE: The search radius is calculated from the center of the map.

2. Free-text search
The website has a context sensitive search box (located in the top left corner of the map) that gives you 100% flexibility in what you can search for, location-wise. A results list (attached to the search box) will update with your every keystroke and offer suggestions as you type.

3. List View button
Beside the search criteria dropdowns, there is a "List View" button. This button converts the results you currently see on the map into a list view format. As you hover over each restaurant in the list view, you will see where it is located on the map instantly. The list will follow the sort order you selected in the sort order dropdown.

4. Refresh button
Beside the List View button, there is a Refresh button. This button simply requeries the Yelp Search API with the current search criteria. This option is useful when you manually change location on the map and want to see which results come up at that new location.


## Features

1. On a desktop computer, you can view a restaurant's details simply by hovering the cursor over a marker.
2. When user clicks a marker, the information box will remain visible and the user can click the business name to follow a link to Yelp's site with further details and/or click the phone number to give the restaurant a call.

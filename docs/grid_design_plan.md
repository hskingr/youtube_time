I want to show a grid of all videos that have been fetched from the database.

This meaans I would need to display 1440 small thumbnails.

Each thumbnail can be clicked on to load an enlarged version of the video

To get everything, an api call would need to be made to the backend

The backend would then return a json array of the 1440 entries with their thumbnails.

Note: I would need to update the sqlite db to ensure that the thumbnails are grabbed and downloaded.

Some questions

1. Fetching 1440 results is quite a lot. I should do some caching on the frontend to make sure this isnt done each time.
2. We should have an overlay on each thumbnail to show the time. The grid can be scrolled (maybe infinitel), and when the user laods a page the thumbnail is put into focus.
3. should we store the images as urls to fetch from the youtube domain (https://i.ytimg.com/vi/CR8pNozyN0s/default.jpg) or download them and fetch them ourselves?

We should definately use some kind of lazy loading so not everything is displayed at once. Would that mean that the api calls that are made to get all the values could be restricted. For example, if it is 14:54 we can make a request to the api where only 50 results after and before are returned. When the user scrolls, we could load the correct ones depending on what position the user is in,


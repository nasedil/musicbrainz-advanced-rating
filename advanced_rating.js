// ==UserScript==
// @name        MusicBrainz Advanced Rating
// @namespace   Violentmonkey Scripts
// @match       *://*.musicbrainz.org/*
// @grant       none
// @version     0.1.1
// @author      nasedil_genio (Рябэ Мёщюлюзу)
// @description 17/11/2024, 23:21:14
// ==/UserScript==

(function () {
    'use strict';

    // Utility function to create and style elements
    function createElement(tag, options = {}) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(options)) {
            if (key === 'style') Object.assign(element.style, value);
            else element[key] = value;
        }
        return element;
    }

    // Convert stars into a custom rectangle with a numeric rating and dropdown
    document.querySelectorAll('.inline-rating').forEach((ratingContainer) => {
        // Find the current rating (width style indicates percentage, e.g., 90% for 4.5 stars)
        const currentRatingElement = ratingContainer.querySelector('.current-user-rating');
        let backColor = 'lightgray';
        let ratingPercentage = 0;
        if (!currentRatingElement) {
          backColor = 'lightblue'; // not rated yet
        } else {
          ratingPercentage = parseFloat(currentRatingElement.style.width); // e.g., 90
        }

        const entityId = ratingContainer.querySelector('a.set-rating')?.getAttribute('href')?.match(/entity_id=(\d+)/)?.[1];
        const entityType = ratingContainer.querySelector('a.set-rating')?.getAttribute('href')?.match(/entity_type=([a-z_]+)&/)?.[1];

        // Clear existing children of the container
        ratingContainer.innerHTML = '';
        Object.assign(ratingContainer.style, {
          height: '17px',
          overflow: 'hidden',
          verticalAlign: 'middle',
        });

        // Create the rating bar container
        const ratingBar = createElement('div', {
            style: {
                display: 'flex',
                width: '200px',
                height: '17px',
                backgroundColor: backColor,
                position: 'relative',
            },
        });

        // Create the rated portion
        const ratedBar = createElement('div', {
            style: {
                width: `${ratingPercentage}%`,
                backgroundColor: 'orange',
                height: '100%',
            },
        });

        // Add the bars to the rating container
        ratingBar.appendChild(ratedBar);
        ratingContainer.appendChild(ratingBar);

        // Add a dropdown for rating submission
        const dropdown = createElement('select', {
            style: {
                position: 'relative',
                top: '-17.25px',
                left: '0',
                width: '200px',
                height: '17px',
                opacity: 0.5,
                textAlign: 'center',
                backgroundColor: 'white',
                border: '1px solid gray',
                fontSize: '10px',
            },
        });

        //const ratings = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
        //const ratings = [0, 11, 22, 33, 44, 55, 66, 77, 88, 99]; // tertiary, avoid 20, 40, 60, 80, 100
        const ratings = [0, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81, 87, 93, 99]; // binary, avoid 20, 40, 60, 80, 100
        // Populate dropdown with rating options
        for (let i of ratings) {
            const option = createElement('option', {
                value: i,
                textContent: i,
            });
            if (Math.round(ratingPercentage) === i) option.selected = true;
            dropdown.appendChild(option);
        }
        if (!ratings.includes(Math.round(ratingPercentage))) {
            const option = createElement('option', {
                value: ratingPercentage,
                textContent: ratingPercentage,
            });
            option.selected = true;
            dropdown.appendChild(option);
        }

        // Handle rating submission
        dropdown.addEventListener('change', (event) => {
            const selectedRating = event.target.value; // 0-100 scale
            const submitUrl = `/rating/rate/?entity_type=${entityType}&entity_id=${entityId}&rating=${selectedRating}&returnto=${encodeURIComponent(location.pathname)}`;
            if (entityId) {
              fetch(submitUrl, {
                  method: 'POST',
              })
                  .then((response) => {
                      if (response.ok) {
                          console.log(`Rating submitted: ${selectedRating}`);
                          ratingBar.style.backgroundColor = 'lightgray';
                          ratedBar.style.width = `${selectedRating}%`;
                      } else {
                          alert('Failed to submit rating');
                      }
                  })
                  .catch((err) => console.error('Rating submission failed:', err));
            }
        });

        ratingContainer.appendChild(dropdown);
    });
})();

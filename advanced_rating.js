// ==UserScript==
// @name        MusicBrainz Advanced Rating
// @namespace   Violentmonkey Scripts
// @match       *://*.musicbrainz.org/*
// @grant       GM_getValue
// @grant       GM_setValue
// @version     0.2.0
// @author      nasedil_genio (Рябэ Мёщюлюзу)
// @description 17/11/2024, 23:21:14
// ==/UserScript==

// Version history:
// 0.1.1: use ratings from 1 to 100 instead of 1 to 5 stars
// 0.2.0: log rating events to store time and date where an entity was rated


// rating event:
// {
//   entity_type: string,        // "release_group", "artist", ...
//   entity_id: string,          // numeric ID as string
//   rating: number,             // 0–100
//   previous_rating: number,    // 0-100, 0 means no rating
//   note: string,               // free text, "" allowed
//   timestamp: string,          // ISO 8601 UTC
//   script_version: string
// }

(function () {
    'use strict';

    const SCRIPT_VERSION = '0.2.0';
    const STORAGE_KEY = 'rating_events';

    // get log of rating events
    function getRatingEvents() {
        try {
            const raw = GM_getValue(STORAGE_KEY, []);
            return Array.isArray(raw) ? raw : [];
        } catch {
            return [];
        }
    }

    // append rating event to the log
    function appendRatingEvent(event) {
        const events = getRatingEvents();
        events.push(event);
        GM_setValue(STORAGE_KEY, events);
        return events.length - 1; // return index of appended event
    }

    // update note for an existing event
    function updateEventNote(index, note) {
      const events = getRatingEvents();
      if (!events[index]) return;
      events[index].note = note;
      GM_setValue(STORAGE_KEY, events);
    }

    // export rating events to CSV
    function exportEventsJSON() {
      const events = getRatingEvents();
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `musicbrainz_ratings_${new Date().toISOString()}.json`;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // export rating events to CSV
    function exportEventsCSV() {
      const events = getRatingEvents();
      if (events.length === 0) return;

      const header = Object.keys(events[0]).join(',');
      const rows = events.map(ev =>
          [
              ev.timestamp,
              ev.entity_type,
              ev.entity_id,
              ev.rating,
              ev.previous_rating,
              `"${(ev.note || '').replace(/"/g, '""')}"`, // escape quotes
              ev.script_version
          ].join(',')
      );
      const csvContent = [header, ...rows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `musicbrainz_ratings_${new Date().toISOString()}.csv`;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // show editor to edit rating notes
    function showNoteEditorNear(container, eventIndex) {
        const rect = container.getBoundingClientRect();

        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Why? (optional)';
        Object.assign(textarea.style, {
            position: 'absolute',
            top: `${rect.bottom + window.scrollY + 5}px`, // 5px below
            left: `${rect.left + window.scrollX}px`,
            width: '400px',       // comfortable width
            height: '120px',      // multiple lines
            fontSize: '12px',
            zIndex: 9999,
            resize: 'both',
            boxShadow: '0 0 5px rgba(0,0,0,0.3)',
            background: 'white',
            padding: '5px',
            border: '1px solid gray',
        });

        let saved = false;

        textarea.addEventListener('blur', () => {
            if (saved) return;
            saved = true;
            const note = textarea.value.trim();
            if (note !== '')
              updateEventNote(eventIndex, note);
              console.log("Rating note event:", eventIndex, note);
            textarea.remove();
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                saved = true;
                textarea.remove();
            }
        });

        document.body.appendChild(textarea);
        textarea.focus();
    }

    // add button to export rating event logs
    function addExportButtons() {
      const container = document.querySelector('#header') || document.body;
      const btnJSON = document.createElement('button');
      btnJSON.textContent = 'Export Ratings JSON';
      Object.assign(btnJSON.style, { margin: '2px' });
      btnJSON.onclick = exportEventsJSON;

      const btnCSV = document.createElement('button');
      btnCSV.textContent = 'Export Ratings CSV';
      Object.assign(btnCSV.style, { margin: '2px' });
      btnCSV.onclick = exportEventsCSV;

      container.appendChild(btnJSON);
      container.appendChild(btnCSV);
    }
    addExportButtons();

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
            if (Math.round(ratingPercentage) === i)
                option.selected = true;
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
                          // log update with timestamp
                          const event = {
                            entity_type: entityType,
                            entity_id: String(entityId),
                            rating: Number(selectedRating),
                            previous_rating: Number(ratingPercentage), // 0 means “no rating”
                            note: "",
                            timestamp: new Date().toISOString(),
                            script_version: SCRIPT_VERSION,
                          };
                          const eventIndex = appendRatingEvent(event);
                          console.log("Rating event logged:", event);
                          // UI update
                          ratingBar.style.backgroundColor = 'lightgray';
                          ratedBar.style.width = `${selectedRating}%`;
                          // show UI to add text note
                          showNoteEditorNear(ratingContainer, eventIndex);
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

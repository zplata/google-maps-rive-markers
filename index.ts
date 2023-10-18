/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Rive, StateMachineInput } from "@rive-app/canvas";

interface Place {
  position: {
    lat: number;
    lng: number;
  };
  address: string;
  name: string;
}

let autoC;
let addedPlaces: Place[] = [];
let map: google.maps.Map;
let legendULElement: HTMLUListElement;
let smInputs: StateMachineInput[]  = [];

// Load in the Autocomplete API and associate it with the text input in index.html
async function initAutocomplete() {
  legendULElement = document.getElementById('added-places') as HTMLUListElement;
  const {Autocomplete} = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
  autoC = new Autocomplete(document.getElementById("autocomplete") as HTMLInputElement, {
    types: ["establishment"],
    componentRestrictions: {
      country: ["US"],
    },
    fields: ["place_id", "geometry", "name", "formatted_address"],
  });
  autoC.addListener("place_changed", onPlaceChange);
}

// When a user has selected a destination, create a new AdvancedMarker with
// Rive content when it has loaded the custom HTML (i.e. the canvas element)
// into the DOM
async function onPlaceChange() {
  const { AdvancedMarkerElement } = (await google.maps.importLibrary(
    "marker",
  )) as google.maps.MarkerLibrary;
  const place = autoC.getPlace();
  if (place.geometry) {
    const newPlace = {
      position: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
      address: place.formatted_address,
      name: place.name,
    };
    addedPlaces.push(newPlace);
    const currentIdx = addedPlaces.length - 1;
    const aMarker = new AdvancedMarkerElement({
      map,
      content: buildContent(newPlace, currentIdx),
      position: newPlace.position,
      title: place.name,
    });
    let smInput: StateMachineInput;

    setTimeout(() => {
      const r = new Rive({
        src: "marker_.riv",
        canvas: document.getElementById(`canvas-${currentIdx}`) as HTMLCanvasElement,
        stateMachines: "Motion",
        autoplay: true,
        onLoad: () => {
          console.log('loaded');
          smInput = r.stateMachineInputs("Motion")[0];
          smInputs.push(smInput);
          addPlaceToList(newPlace, smInput, aMarker);
        },
      });
    }, 500);

    aMarker.addListener("click", () => {
      toggleHighlight(aMarker);
    });
  }
}

// Add the selected destination to a "legend" list that users can hover over and
// click on to highlight the AdvancedMarker graphic on the map
function addPlaceToList(place: Place, riveInput: StateMachineInput, marker: google.maps.marker.AdvancedMarkerElement) {
  const legendContainer = document.querySelector('.places-container');
  if (legendContainer?.classList.contains('hidden')) {
    legendContainer.classList.remove('hidden');
  }
  const newLineItem = document.createElement('li');
  newLineItem.classList.add('legend-place');
  newLineItem.innerHTML = `
    <p>${place.name}</p>
  `;
  newLineItem.addEventListener('mouseenter', () => {
    riveInput.value = true;
  });
  newLineItem.addEventListener('click', () => {
    toggleHighlight(marker);
  });
  newLineItem.addEventListener('mouseleave', () => {
    riveInput.value = false;
  });
  legendULElement.appendChild(newLineItem);
}

// Initialize the Map and load it into our app
async function initMap() {
  // Request needed libraries.
  const { Map } = (await google.maps.importLibrary(
    "maps",
  )) as google.maps.MapsLibrary;
  const { LatLng } = (await google.maps.importLibrary(
    "core",
  )) as google.maps.CoreLibrary;

  const center = new LatLng(41.8781, -87.6298);
  map = new Map(document.getElementById("map") as HTMLElement, {
    zoom: 11,
    center,
    mapId: "737244cb20fa7a98",
  });

}

// Show a popup when the marker is clicked (via CSS class)
function toggleHighlight(markerView) {
  if (markerView.content.classList.contains("highlight")) {
    markerView.content.classList.remove("highlight");
    markerView.zIndex = null;
  } else {
    markerView.content.classList.add("highlight");
    markerView.zIndex = 1;
  }
}

// Builds the "custom" advanced google maps marker markup
function buildContent(property, idx) {
  const content = document.createElement("div");
  const canvasEl = document.createElement('canvas');
  canvasEl.style.width = '100%';
  canvasEl.style.height = '100%';
  canvasEl.id = `canvas-${idx}`;
  content.classList.add("property");
  content.innerHTML = `
    <div id="parent-thing" class="icon">
      ${canvasEl.outerHTML}
      <span class="fa-sr-only">${property.type}</span>
    </div>
    <div class="details">
        <div class="price">${property.name}</div>
        <div class="address">${property.address}</div>
    </div>
    `;
  return content;
}

initMap();
initAutocomplete();
export {};

'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description =
      `${this.constructor.name} on ` +
      new Intl.DateTimeFormat(navigator.language, {
        month: 'long',
        day: '2-digit',
      }).format(this.date);
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

/////////////////////////////////////////////////////////////
//? APPLICATION ARCHITECTURE
class App {
  #map;
  #mapE;
  #workouts = [];
  #mapZoomLvl = 15;
  constructor() {
    this._getPosition();
    // Get data from local storage
    this._getSavedWorkouts();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // prettier-ignore
    if (navigator.geolocation)
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => alert('Unable to get your location'));
  }

  _loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLvl);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }
    ).addTo(this.#map);

    // Handling click on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(w => {
      this._renderWorkoutMarker(w);
    });
  }

  _showForm({ latlng: { lat, lng } }) {
    this.#mapE = { lat, lng };
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // empty input fields
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputDistance.focus();
  }

  _newWorkout(e) {
    //prettier-ignore
    const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);
    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapE;
    let workout;
    // create new workout based on activity type
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      // prettier-ignore
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) 
        return alert('All fields must be (positive) numbers');

      //prettier-ignore
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      // prettier-ignore
      if (!validInputs(distance, duration, elevationGain) || !allPositive(distance, duration)) {
        
        return alert('All fields must be (positive) numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }
    //add new workout to workouts array
    // render new workout on list
    this.#workouts.push(workout);

    // render new workout on map as marker
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);

    // clear the form + hide the form
    this._hideForm();

    // Set local storage to workouts array
    this._saveWorkouts();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚲'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
     
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚲'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;
    if (workout.type === 'running')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    if (workout.type === 'cycling')
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    //prettier-ignore
    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getSavedWorkouts() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    this.#workouts = data || [];
    this.#workouts.forEach(w => {
      this._renderWorkout(w);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
console.log('"app.reset()" to remove all workouts');

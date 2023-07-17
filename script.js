'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout{
    id = (Date.now() + '').slice(-10);
    date = new Date();
    title;
    type;

    constructor(type, croords, distance, duration){
        this.type = type;
        this.croords = croords;
        this.distance = distance;
        this.duration = duration;
        this.genarateTitle();
    }

    genarateTitle(){
        this.title = `${this.type} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    get type(){
        return this.type;
    }
}

class Running extends Workout{
    constructor(croords, distance, duration, cadence){
        super('Running', croords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
    }

    calcPace(){
        this.pace = this.duration / this.distance;
        return this.pace;
    }

}

class Cycling extends Workout{
    constructor(croords, distance, duration, eleveationGain){
        super('Cycling', croords, distance, duration);
        this.eleveationGain = eleveationGain;
        this.calcSpeed();
    }

    calcSpeed(){
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App{
    #map;
    #curentCoords;
    #workouts = [];
    #mapZommLevel = 13;

    constructor(){
        this._getPosition();
        this._eventHandler();
    }

    _eventHandler(){
        form.addEventListener('submit', this._createNewWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        
        containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
    }

    _getPosition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
            function(){
                alert('Could not get your location!');
            });
        }
    }

    _loadMap(position){
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude]

        this.#map = L.map('map').setView(coords, 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this._getLocalStorage();
    }

    _showForm(mapEvent){
        const {lat, lng} = mapEvent.latlng;
        this.#curentCoords = [lat, lng]

        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _toggleElevationField(){
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _createNewWorkout(e){
        e.preventDefault();

        // get inpput
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        let cadenceOrElevation = (type === 'running') ? +inputCadence.value : +inputElevation.value;

        if(type !== 'running' && type !== 'cycling'){
            return;
        }

        if(!this._isValidInputs(distance, duration, cadenceOrElevation)){
            return alert('inputs must be number positive');
        }
        
        let workout = (type === 'running') 
            ? new Running(this.#curentCoords, distance, duration, cadenceOrElevation) 
            : new Cycling(this.#curentCoords, distance, duration, cadenceOrElevation)
        ;

        this.#workouts.push(workout);
        this._setLocalStorage();

        this._pinWorkoutOnMap(workout);
        this._appendWorkoutToList(workout);
        this._hideForm();
    }

    _isValidInputs(...inputs){
        return this._isNumber(inputs) && this._isPositiveNumbers(inputs);
    }

    _isNumber(inputs){
        return inputs.every((inp) => Number.isFinite(inp) );
    }

    _isPositiveNumbers(inputs){
        return inputs.every(input => input > 0);
    }

    _pinWorkoutOnMap(workout, options = {
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
    }){
        options.className = `${workout.type.toLowerCase()}-popup`;
        L.marker(workout.croords).addTo(this.#map)
            .bindPopup(L.popup(options))
            .setPopupContent(`${(workout.type === 'Running') ? '🏃‍♂️' : '🚴‍♀️'} ${workout.title}`)
            .openPopup();
    }
    
    _loadWorkoutList(){
        this.#workouts.forEach(workout => {
            this._appendWorkoutToList(workout);
            this._pinWorkoutOnMap(workout);
        })
    }

    _appendWorkoutToList(workout){
        let htmlWorkout = `
        <li class="workout workout--${workout.type.toLowerCase()}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.title}</h2>
            <div class="workout__details">
                <span class="workout__icon">${(workout.type === 'Running') ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${(workout.type === 'Running') ? workout.pace : workout.speed}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">${(workout.type === 'Running') ? '🦶🏼' : '⛰'}</span>
                <span class="workout__value">${(workout.type === 'Running') ? workout.cadence : workout.eleveationGain}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>
        `;
        form.insertAdjacentHTML('afterend', htmlWorkout);
    }

    _hideForm(){
        form.querySelectorAll('input').forEach(input => {
            input.value = '';
        });
        form.classList.add('hidden');
    }

    _moveToWorkout(e){
        const workoutElement = e.target.closest('.workout');
        
        if(!workoutElement) return;

        let workoutTarget = this.#workouts.find(workout => {
            return workout.id === workoutElement.dataset.id;
        });

        this.#map.setView(workoutTarget.croords, this.#mapZommLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        let data = JSON.parse(localStorage.getItem('workouts'));
        
        if(!data) return;

        this.#workouts = data;

        this._loadWorkoutList();
    }

    _reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();
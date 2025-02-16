// Wait for the DOM to fully load before executing the script
document.addEventListener("DOMContentLoaded", function() {
  // Initialize Materialize select elements so that your sticker drop-down is properly styled and functional
  $('select').material_select();

  var currentDate = new Date();
  var selectedDate = currentDate;
  var selectedDayBlock = null;
  var globalEventObj = JSON.parse(localStorage.getItem('events')) || {};
  var globalStickerObj = JSON.parse(localStorage.getItem('stickers')) || {};
  var gridTable = document.getElementById("table-body");

  $(".button-collapse").sideNav();

  /**
   * Fetch public holidays from API for the given year.
   * @param {number} year - The year to fetch holidays for.
   * @returns {Promise<Array>} - A list of holiday objects.
   */
  async function fetchHolidays(year) {
    const url = `https://public-holidays7.p.rapidapi.com/${year}/US`;
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': '71e3466119mshfcff9f6775e9a01p16c9ecjsn646561b6676e',
        'X-RapidAPI-Host': 'public-holidays7.p.rapidapi.com'
      }
    };
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`Error: ${response.status} - ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      return [];
    }
  }

  /**
   * Create and render the calendar for a given date using a grid layout.
   * Each day is rendered in a square cell.
   * @param {Date} date - The date representing the month/year to display.
   * @param {string} side - Animation direction ("left" or "right").
   */
  async function createCalendar(date, side) {
    var currentDate = date;
    var startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    var endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    var monthTitle = document.getElementById("month-name");

    // Update header with current month and year
    monthTitle.innerHTML = `${currentDate.toLocaleString("en-US", { month: "long" })} ${currentDate.getFullYear()}`;
    gridTable.innerHTML = ""; // Clear previous calendar cells

    // Remove any animation classes before re-building
    gridTable.classList.remove("animated", "fadeInLeft", "fadeInRight");

    // Add empty cells for days before the first day (since we're using a 7-column grid)
    var firstDayIndex = startDate.getDay();
    for (let i = 0; i < firstDayIndex; i++) {
      let emptyCell = document.createElement("div");
      emptyCell.className = "cell empty-day";
      gridTable.appendChild(emptyCell);
    }

    // Fetch holidays for the current year
    const holidays = await fetchHolidays(currentDate.getFullYear());

    // Create a cell for each day in the month
    for (let dayCount = 1; dayCount <= endDate.getDate(); dayCount++) {
      let dayCell = document.createElement("div");
      dayCell.className = "cell calendar-day";
      let cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayCount);
      let eventDateStr = cellDate.toDateString();
      // Save the date in a data attribute (using toLocaleDateString for consistency)
      dayCell.setAttribute('data-date', cellDate.toLocaleDateString());
      dayCell.innerHTML = dayCount;

      // Highlight today's date by adding the "today" class if it matches
      if (new Date().toDateString() === eventDateStr) {
        dayCell.classList.add("today");
      }

      // If an event exists for that day, show a pushpin emoji
      if (globalEventObj[eventDateStr]) {
        let pushpinEmoji = document.createElement("span");
        pushpinEmoji.innerHTML = "📌";
        pushpinEmoji.className = "pushpin-emoji";
        dayCell.appendChild(pushpinEmoji);
      }

      // If the cell's date matches a holiday, add the holiday class
      if (holidays.some(holiday => new Date(holiday.date).toDateString() === eventDateStr)) {
        dayCell.classList.add('holiday');
      }

      // If there are stickers stored for that day, display them
      if (globalStickerObj[eventDateStr]) {
        globalStickerObj[eventDateStr].forEach(sticker => {
          let stickerElement = document.createElement("span");
          stickerElement.innerHTML = sticker;
          stickerElement.className = "sticker";
          dayCell.appendChild(stickerElement);
        });
      }

      gridTable.appendChild(dayCell);
    }

    // Update the sidebar with events and holidays for the month
    displayMonthlyEvents(currentDate, holidays);

    // Apply animation based on navigation direction
    if (side === "left") {
      gridTable.classList.add("animated", "fadeInLeft");
    } else if (side === "right") {
      gridTable.classList.add("animated", "fadeInRight");
    }
  }

  /**
   * Display the monthly events and holidays in the sidebar.
   * @param {Date} currentDate - The current displayed month/year.
   * @param {Array} holidays - The list of fetched holidays.
   */
  function displayMonthlyEvents(currentDate, holidays) {
    const sidebarEvents = document.getElementById("sidebarEvents");
    sidebarEvents.innerHTML = "";
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    let hasEvents = false;

    // Loop through all user-created events for the month
    for (let dateStr in globalEventObj) {
      let eventDate = new Date(dateStr);
      if (eventDate.getMonth() === month && eventDate.getFullYear() === year) {
        hasEvents = true;
        for (let eventName in globalEventObj[dateStr]) {
          let eventContainer = document.createElement("div");
          eventContainer.className = "eventCard";
          eventContainer.innerHTML = `<div class="eventCard-header">${eventName} - ${eventDate.toLocaleDateString()}</div>
                                      <div class="eventCard-description">${globalEventObj[dateStr][eventName]}</div>`;
          sidebarEvents.appendChild(eventContainer);
        }
      }
    }

    // Loop through holidays for the month
    holidays.forEach(holiday => {
      let holidayDate = new Date(holiday.date);
      if (holidayDate.getMonth() === month && holidayDate.getFullYear() === year) {
        hasEvents = true;
        let holidayContainer = document.createElement("div");
        holidayContainer.className = "holidayCard";
        holidayContainer.innerHTML = `<div class="holidayCard-header">Holiday: ${holiday.name} - ${holidayDate.toLocaleDateString()}</div>`;
        sidebarEvents.appendChild(holidayContainer);
      }
    });

    // If no events or holidays exist, show a default message
    if (!hasEvents) {
      let noEventMessage = document.createElement("div");
      noEventMessage.textContent = "No events or holidays for this month.";
      noEventMessage.className = "no-events-message";
      sidebarEvents.appendChild(noEventMessage);
    }
  }

  // Add an event to the selected date
  function addEvent(title, desc) {
    let dateStr = selectedDate.toDateString();
    if (!globalEventObj[dateStr]) {
      globalEventObj[dateStr] = {};
    }
    globalEventObj[dateStr][title] = desc;
    localStorage.setItem('events', JSON.stringify(globalEventObj));
    showEvents();
    updatePushpinDisplay();
  }

  // Delete an event from the selected date
  function deleteEvent(eventName, dateStr) {
    if (globalEventObj[dateStr] && globalEventObj[dateStr][eventName]) {
      delete globalEventObj[dateStr][eventName];
      if (Object.keys(globalEventObj[dateStr]).length === 0) {
        delete globalEventObj[dateStr];
      }
      localStorage.setItem('events', JSON.stringify(globalEventObj));
      showEvents();
      updatePushpinDisplay();
    }
  }

  // Add a sticker to the selected date using the sticker drop-down
  function addStickerToSelectedDay() {
    // Get the selected sticker from the drop-down
    var selectedSticker = document.getElementById("sticker-select").value;
    if (!selectedDayBlock) {
      alert("Please select a day on the calendar.");
      return;
    }

    // Create the sticker element and append it to the selected cell
    let stickerElement = document.createElement("span");
    stickerElement.innerHTML = selectedSticker;
    stickerElement.className = "sticker";
    selectedDayBlock.appendChild(stickerElement);

    // Use the data-date attribute to get the cell's date string
    let selectedDayDate = selectedDayBlock.getAttribute('data-date');
    if (!globalStickerObj[selectedDayDate]) {
      globalStickerObj[selectedDayDate] = [];
    }
    globalStickerObj[selectedDayDate].push(selectedSticker);
    localStorage.setItem('stickers', JSON.stringify(globalStickerObj));

    // Add an event listener to allow deletion of the sticker when clicked
    stickerElement.addEventListener('click', function() {
      deleteSticker(selectedDayDate, selectedSticker, stickerElement);
    });
  }

  // Delete a sticker from the selected date
  function deleteSticker(dateStr, sticker, stickerElement) {
    stickerElement.remove(); // Remove from the DOM
    globalStickerObj[dateStr] = globalStickerObj[dateStr].filter(s => s !== sticker);
    if (globalStickerObj[dateStr].length === 0) {
      delete globalStickerObj[dateStr];
    }
    localStorage.setItem('stickers', JSON.stringify(globalStickerObj));
  }

  // Update the display of pushpins based on events
  function updatePushpinDisplay() {
    Array.from(gridTable.getElementsByClassName('cell')).forEach(cell => {
      if (!cell.classList.contains('empty-day')) {
        let day = parseInt(cell.innerText);
        let dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
        if (globalEventObj[dateStr]) {
          if (!cell.querySelector(".pushpin-emoji")) {
            let pushpinEmoji = document.createElement("span");
            pushpinEmoji.innerHTML = "📌";
            pushpinEmoji.className = "pushpin-emoji";
            cell.appendChild(pushpinEmoji);
          }
        } else {
          let pushpinIcon = cell.querySelector(".pushpin-emoji");
          if (pushpinIcon) {
            cell.removeChild(pushpinIcon);
          }
        }
      }
    });
  }

  // Load stickers from storage and display them on the calendar
  function loadAndDisplayStickers() {
    for (let day in globalStickerObj) {
      let dayElement = document.querySelector(`[data-date='${new Date(day).toLocaleDateString()}']`);
      if (dayElement) {
        globalStickerObj[day].forEach(sticker => {
          let stickerElement = document.createElement("span");
          stickerElement.textContent = sticker;
          stickerElement.className = "sticker";
          dayElement.appendChild(stickerElement);
        });
      }
    }
  }

  // Handle calendar cell clicks to select a day
  gridTable.onclick = function(e) {
    if (!e.target.classList.contains("cell") || e.target.classList.contains("empty-day")) {
      return;
    }
    if (selectedDayBlock) {
      selectedDayBlock.classList.remove("selected");
    }
    selectedDayBlock = e.target;
    selectedDayBlock.classList.add("selected");
    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(e.target.innerText));
    showEvents();
  };

  // Handle month navigation (previous)
  var prevButton = document.getElementById("prev");
  var nextButton = document.getElementById("next");

  prevButton.onclick = function() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    createCalendar(currentDate, "left");
  };

  // Handle month navigation (next)
  nextButton.onclick = function() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    createCalendar(currentDate, "right");
  };

  // Initialize sticker adding (requires an element with id "add-sticker-button")
  document.getElementById("add-sticker-button").addEventListener("click", function(event) {
    event.preventDefault();
    addStickerToSelectedDay();
  });

  // Initialize event adding
  var changeFormButton = document.getElementById("changeFormButton");
  var addForm = document.getElementById("addForm");
  var cancelAdd = document.getElementById("cancelAdd");
  var addEventButton = document.getElementById("addEventButton");

  changeFormButton.onclick = function() {
    addForm.style.top = 0;
  };

  cancelAdd.onclick = function() {
    addForm.style.top = "100%";
    resetFormInputs();
  };

  addEventButton.onclick = function() {
    let title = document.getElementById("eventTitleInput").value.trim();
    let desc = document.getElementById("eventDescInput").value.trim();
    if (!title || !desc) {
      alert("Please fill in both title and description.");
      return;
    }
    addEvent(title, desc);
    resetFormInputs();
    addForm.style.top = "100%";
  };

  function resetFormInputs() {
    let inputs = addForm.getElementsByTagName("input");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].value = "";
    }
    let labels = addForm.getElementsByTagName("label");
    for (let i = 0; i < labels.length; i++) {
      labels[i].className = "";
    }
  }

  // Show events and stickers for the selected date in the sidebar
  function showEvents() {
    let sidebarEvents = document.getElementById("sidebarEvents");
    sidebarEvents.innerHTML = "";
    let dateStr = selectedDate.toDateString();
    let eventsForDate = globalEventObj[dateStr];
    let stickersForDate = globalStickerObj[dateStr];

    // Display events
    if (eventsForDate) {
      for (let eventName in eventsForDate) {
        let eventContainer = document.createElement("div");
        eventContainer.className = "eventCard";
        let eventHeader = document.createElement("div");
        eventHeader.className = "eventCard-header";
        eventHeader.appendChild(document.createTextNode(eventName));
        eventContainer.appendChild(eventHeader);
        let eventDescription = document.createElement("div");
        eventDescription.className = "eventCard-description";
        eventDescription.appendChild(document.createTextNode(eventsForDate[eventName]));
        eventContainer.appendChild(eventDescription);
        let deleteButton = document.createElement("button");
        deleteButton.innerHTML = "Delete";
        deleteButton.className = "deleteEventButton";
        deleteButton.onclick = function() {
          deleteEvent(eventName, dateStr);
        };
        eventContainer.appendChild(deleteButton);
        sidebarEvents.appendChild(eventContainer);
      }
    }

    // Display stickers
    if (stickersForDate) {
      stickersForDate.forEach(sticker => {
        let stickerContainer = document.createElement("div");
        stickerContainer.className = "stickerCard";
        let stickerHeader = document.createElement("div");
        stickerHeader.className = "stickerCard-header";
        stickerHeader.appendChild(document.createTextNode(`Sticker: ${sticker}`));
        stickerContainer.appendChild(stickerHeader);
        let deleteStickerButton = document.createElement("button");
        deleteStickerButton.innerHTML = "Delete Sticker";
        deleteStickerButton.className = "deleteStickerButton";
        deleteStickerButton.onclick = function() {
          deleteSticker(dateStr, sticker, stickerContainer);
        };
        stickerContainer.appendChild(deleteStickerButton);
        sidebarEvents.appendChild(stickerContainer);
      });
    }

    // Display a message if no events or stickers exist
    if (!eventsForDate && !stickersForDate) {
      let noEventMessage = document.createElement("div");
      noEventMessage.textContent = "No events or stickers for this day.";
      noEventMessage.className = "no-events-message";
      sidebarEvents.appendChild(noEventMessage);
    }
  }

  // Display today's date in the header
  function displayTodaysDate() {
    let today = new Date();
    let todayDayName = document.getElementById("todayDayName");
    todayDayName.innerHTML = "Today is " + today.toLocaleString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  // Initialize the calendar and display today's date, then load stickers and update pushpins
  createCalendar(currentDate, null).then(() => {
    displayTodaysDate();
    loadAndDisplayStickers();
    updatePushpinDisplay();
  });
});

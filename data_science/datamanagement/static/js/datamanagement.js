document.addEventListener('DOMContentLoaded', () => {

    const applyBorder = e => {
        const inputContainer = e.target.parentElement;
        inputContainer.classList.toggle('outline');
    }

    const inputs = document.querySelectorAll('#input_subject_id');
    inputs.forEach(input => {
        input.addEventListener('focus', e => applyBorder(e));
        input.addEventListener('blur', e => applyBorder(e));
    });

}, false);

$(function () {
    $("#row_id_input").autocomplete({
        source: '/datamanagement/search_row_id/'
    });
});


// Load the cities straight from the server, passing the country as an extra param
$("#input_subject_id").autocomplete({
    source: function (request, response) {
        $.ajax({
            url: window.location.href + "datamanagement/search_subject_id/", dataType: "json", data: {
                term: request.term,

            }, success: function (data) {
                data.sort((a, b) => Number(a) - Number(b));

                update_list(data, list, input);
            }
        });
    },
});

$("#input_diagnosis_id").autocomplete({
    source: function (request, response) {
        $.ajax({
            url: window.location.href + "datamanagement/search_diagnosis/", dataType: "json", data: {
                term: request.term,

            }, success: function (response_diagnosis) {


                // map only the value on array
                const diagnosis_json = JSON.parse(response_diagnosis);
                const diagnosis_arr = Object.values(diagnosis_json).map(v => v.toLowerCase().split("\\"));

                const input = document.getElementById("input_diagnosis_id");
                const list = document.getElementById("list_diagnosis_id");
                updateList(diagnosis_arr, list, input);

            }
        });
    },
});

// ====== Example data for suggestions ======
const input = document.getElementById("input_subject_id");
const list = document.getElementById("list_subject_id");

function update_list(list_item) {

    // Clear old list items
    list.textContent = "";  // list.textContent;
    list.classList.remove("visible");
    if (list_item.length === 0) {
        list.classList.remove("visible");
        return;
    }
    // Create li elements
    list_item.forEach(item => {
        const li = document.createElement("li");
        li.className = "autocomplete-item";
        li.textContent = item;

        li.addEventListener("click", () => {

            input.value = item;
            list.classList.remove("visible");
        });

        list.appendChild(li);
    });

    list.classList.add("visible");
}

// Handle keyboard navigation
input.addEventListener("keydown", (e) => {
    const items = Array.from(list.querySelectorAll(".autocomplete-item"));
    if (!items.length || !list.classList.contains("visible")) return;

    if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveItem(items);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveItem(items);
    } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < items.length) {
            e.preventDefault();
            const text = items[activeIndex].innerText;
            input.value = text;
            list.classList.remove("visible");
        }
    } else if (e.key === "Escape") {
        list.classList.remove("visible");
    }
});


function updateActiveItem(items) {
    items.forEach((item, index) => {
        item.classList.toggle("active", index === activeIndex);
    });

    // Scroll active item into view
    if (activeIndex >= 0) {
        const activeItem = items[activeIndex];
        const itemTop = activeItem.offsetTop;
        const itemBottom = itemTop + activeItem.offsetHeight;
        const listScrollTop = list.scrollTop;
        const listHeight = list.clientHeight;

        if (itemTop < listScrollTop) {
            list.scrollTop = itemTop;
        } else if (itemBottom > listScrollTop + listHeight) {
            list.scrollTop = itemBottom - listHeight;
        }
    }
}

// Hide list when clicking outside
document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete-container")) {
        list.classList.remove("visible");
    }
});


// on keyup for
$("#submit_subject_id").click().autocomplete({
    source: function (request, response) {

        $.ajax({
            type: "POST", url: window.location.href + "datamanagement/show_diagnosis/", data: {
                term: request.term,
                subject_id: $("input[name=input_subject_id]").val(),
                csrfmiddlewaretoken: $("input[name=csrfmiddlewaretoken]").val()
            }, dataType: "json", success: function (json_data) {

            },
        });
    }
});

$("#submit_subject_id").on("click", function () {
    $.ajaxSetup({
        headers: {
            'csrfmiddlewaretoken': $("input[name=csrfmiddlewaretoken]").val()
        }
    });
    $.ajax({
        type: "POST", url: window.location.href + "datamanagement/show_diagnosis/", data: {

            subject_id: $("input[name=input_subject_id]").val(),
            csrfmiddlewaretoken: $("input[name=csrfmiddlewaretoken]").val()
        }, dataType: "json", success: function (json_data) {

            if (json_data.data_lenght === 0) {
                displayMessage("warning", "subject_id '" + json_data.subject_id + "' not found!");

            } else {

                const data = JSON.parse(json_data.data);

                // Get container
                const container = document.getElementById("tableContainer");

                // check if element id_table exist, yes -> insert element on table
                // no -> create new element table

                // check if element table does not exist?
                if (document.getElementById("id_table")) {

                    document.getElementById("id_table").remove();

                }

                // Create table
                const table = document.createElement("table");
                table.setAttribute("id", "id_table");
                table.classList.add("my-table")
                // Create table header
                const thead = document.createElement("thead");
                const headerRow = document.createElement("tr");

                const columns = Object.keys(data);
                columns.forEach(col => {
                    const th = document.createElement("th");
                    th.textContent = col;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);

                // Create table body
                const tbody = document.createElement("tbody");

                // Number of rows
                const rowKeys = Object.keys(data[columns[0]]);
                rowKeys.forEach(rowKey => {
                    const tr = document.createElement("tr");
                    columns.forEach(col => {
                        const td = document.createElement("td");
                        let value;

                        // convert the date like '3814732800000' as 'Sat Sep 18 2099' [birthday]
                        if (col === "Birthday" || col === "Admission_time") {
                            const item_value = new Date(data[col][rowKey]);
                            const year = item_value.getFullYear();
                            const month = String(item_value.getMonth() + 1).padStart(2, '0');
                            const day = String(item_value.getDate()).padStart(2, '0');
                            const formatted = `${day}-${month}-${year}`;
                            value = formatted;

                        } else if (col === "Diagnosis" || col === "Marital_status") {
                            value = (data[col][rowKey] || "").toLowerCase();
                        } else if (col === "Died") {
                            const item_value = data[col][rowKey];
                            if (item_value === 0) {
                                value = "No";
                            } else {
                                value = "Yes";
                            }
                        } else {
                            value = data[col][rowKey];
                        }
                        if (value === null) value = ""; // handle null
                        td.textContent = value;
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });

                table.appendChild(tbody);

                // Append table to container
                container.appendChild(table);

            }


        }, error: function (data) {

        }


    });
});


// slider button
/*
const slideValue = document.querySelector("span");
const inputSlider = document.querySelector("#feature1");
inputSlider.oninput = (() => {
    let value = inputSlider.value;
    slideValue.textContent = value;
    slideValue.style.left = (value * 10) + "%";
    slideValue.classList.add("show");
});
inputSlider.onblur = (() => {
    //slideValue.classList.remove("show");
});
*/
// new code

let activeIndex = -1;

function updateList(listItems, list, input) {

    // Clear old list
    list.textContent = "";
    list.classList.remove("visible");
    activeIndex = -1;

    if (!listItems || listItems.length === 0) return;

    // Create items
    listItems.forEach(item => {
        const li = document.createElement("li");
        li.className = "autocomplete-item";
        li.textContent = item;

        li.addEventListener("click", () => {
            input.value = item;
            list.classList.remove("visible");
        });

        list.appendChild(li);
    });

    list.classList.add("visible");

    // Keyboard navigation
    input.onkeydown = (e) => {
        const items = Array.from(list.querySelectorAll(".autocomplete-item"));
        if (!items.length || !list.classList.contains("visible")) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateActiveItem(items, list);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateActiveItem(items, list);
        } else if (e.key === "Enter") {
            if (activeIndex >= 0) {
                e.preventDefault();
                input.value = items[activeIndex].innerText;
                list.classList.remove("visible");
            }
        } else if (e.key === "Escape") {
            list.classList.remove("visible");
        }
    };

    // Hide when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".autocomplete-container")) {
            list.classList.remove("visible");
        }
    });
}

function updateActiveItem(items, list) {
    items.forEach((item, index) => {
        item.classList.toggle("active", index === activeIndex);
    });

    if (activeIndex >= 0) {
        const activeItem = items[activeIndex];
        const itemTop = activeItem.offsetTop;
        const itemBottom = itemTop + activeItem.offsetHeight;
        const listScrollTop = list.scrollTop;
        const listHeight = list.clientHeight;

        if (itemTop < listScrollTop) {
            list.scrollTop = itemTop;
        } else if (itemBottom > listScrollTop + listHeight) {
            list.scrollTop = itemBottom - listHeight;
        }
    }
}

function displayMessage(type, message) {
    javascript:document.getElementById(type + "Popup").innerHTML = message;
    javascript:document.getElementById(type + "Popup").classList.remove("faded");
    setTimeout(function () {
        javascript:document.getElementById(type + "Popup").classList.add("faded")
    }, 1500);
}

const slider = document.querySelector("input[type='range']");
slider.addEventListener("input", () => {
    slider.style.setProperty("--value", slider.value);
});


// slider input for age
const slider_Age = document.getElementById("slider_Age");
const tooltip_Age = document.getElementById("tooltip_Age");
slider_Age.addEventListener("input", () => {
    tooltip_Age.textContent = slider_Age.value;
    const percent = (slider_Age.value - slider_Age.min) / (slider_Age.max - slider_Age.min);
    tooltip_Age.style.left = `${percent * 100}%`;
});

// slider input for age
const slider_GCS_max = document.getElementById("slider_GCS_max");
const tooltip_GCS_max = document.getElementById("tooltip_GCS_max");
slider_GCS_max.addEventListener("input", () => {
    tooltip_GCS_max.textContent = slider_GCS_max.value;
    const percent = (slider_GCS_max.value - slider_GCS_max.min) / (slider_GCS_max.max - slider_GCS_max.min);
    tooltip_GCS_max.style.left = `${percent * 100}%`;
});

// slider input for age
const slider_GCS_mean = document.getElementById("slider_GCS_mean");
const tooltip_GCS_mean = document.getElementById("tooltip_GCS_mean");
slider_GCS_mean.addEventListener("input", () => {
    tooltip_GCS_mean.textContent = slider_GCS_mean.value;
    const percent = (slider_GCS_mean.value - slider_GCS_mean.min) / (slider_GCS_mean.max - slider_GCS_mean.min);
    tooltip_GCS_mean.style.left = `${percent * 100}%`;
});

// slider input for slider_Lactate_min
const slider_Lactate_min = document.getElementById("slider_Lactate_min");
const tooltip_Lactate_min = document.getElementById("tooltip_Lactate_min");
slider_Lactate_min.addEventListener("input", () => {
    tooltip_Lactate_min.textContent = slider_Lactate_min.value;
    const percent = (slider_Lactate_min.value - slider_Lactate_min.min) / (slider_Lactate_min.max - slider_Lactate_min.min);
    tooltip_Lactate_min.style.left = `${percent * 100}%`;
});

// slider input for slider_Lactate_min
const slider_Lactate_max = document.getElementById("slider_Lactate_max");
const tooltip_Lactate_max = document.getElementById("tooltip_Lactate_max");
slider_Lactate_max.addEventListener("input", () => {
    tooltip_Lactate_max.textContent = slider_Lactate_max.value;
    const percent = (slider_Lactate_max.value - slider_Lactate_max.min) / (slider_Lactate_max.max - slider_Lactate_max.min);
    tooltip_Lactate_max.style.left = `${percent * 100}%`;
});

// slider input for slider_Lactate_min
const slider_Lactate_mean = document.getElementById("slider_Lactate_mean");
const tooltip_Lactate_mean = document.getElementById("tooltip_Lactate_mean");
slider_Lactate_mean.addEventListener("input", () => {
    tooltip_Lactate_mean.textContent = slider_Lactate_mean.value;
    const percent = (slider_Lactate_mean.value - slider_Lactate_mean.min) / (slider_Lactate_mean.max - slider_Lactate_mean.min);
    tooltip_Lactate_mean.style.left = `${percent * 100}%`;
});

const slider_BUN_min = document.getElementById("slider_BUN_min");
const tooltip_BUN_min = document.getElementById("tooltip_BUN_min");
slider_BUN_min.addEventListener("input", () => {
    tooltip_BUN_min.textContent = slider_BUN_min.value;
    const percent = (slider_BUN_min.value - slider_BUN_min.min) / (slider_BUN_min.max - slider_BUN_min.min);
    tooltip_BUN_min.style.left = `${percent * 100}%`;
});

const slider_BUN_mean = document.getElementById("slider_BUN_mean");
const tooltip_BUN_mean = document.getElementById("tooltip_BUN_mean");
slider_BUN_mean.addEventListener("input", () => {
    tooltip_BUN_mean.textContent = slider_BUN_mean.value;
    const percent = (slider_BUN_mean.value - slider_BUN_mean.min) / (slider_BUN_mean.max - slider_BUN_mean.min);
    tooltip_BUN_mean.style.left = `${percent * 100}%`;
});

const slider_AG_max = document.getElementById("slider_AG_max");
const tooltip_AG_max = document.getElementById("tooltip_AG_max");
slider_AG_max.addEventListener("input", () => {
    tooltip_AG_max.textContent = slider_AG_max.value;
    const percent = (slider_AG_max.value - slider_AG_max.min) / (slider_AG_max.max - slider_AG_max.min);
    tooltip_AG_max.style.left = `${percent * 100}%`;
});

const slider_AG_mean = document.getElementById("slider_AG_mean");
const tooltip_AG_mean = document.getElementById("tooltip_AG_mean");
slider_AG_mean.addEventListener("input", () => {
    tooltip_AG_mean.textContent = slider_AG_mean.value;
    const percent = (slider_AG_mean.value - slider_AG_mean.min) / (slider_AG_mean.max - slider_AG_mean.min);
    tooltip_AG_mean.style.left = `${percent * 100}%`;
});

const slider_Bilirubin_max = document.getElementById("slider_Bilirubin_max");
const tooltip_Bilirubin_max = document.getElementById("tooltip_Bilirubin_max");
slider_Bilirubin_max.addEventListener("input", () => {
    tooltip_Bilirubin_max.textContent = slider_Bilirubin_max.value;
    const percent = (slider_Bilirubin_max.value - slider_Bilirubin_max.min) / (slider_Bilirubin_max.max - slider_Bilirubin_max.min);
    tooltip_Bilirubin_max.style.left = `${percent * 100}%`;
});


const slider_Bilirubin_mean = document.getElementById("slider_Bilirubin_mean");
const tooltip_Bilirubin_mean = document.getElementById("tooltip_Bilirubin_mean");
slider_Bilirubin_mean.addEventListener("input", () => {
    tooltip_Bilirubin_mean.textContent = slider_Bilirubin_mean.value;
    const percent = (slider_Bilirubin_mean.value - slider_Bilirubin_mean.min) / (slider_Bilirubin_mean.max - slider_Bilirubin_mean.min);
    tooltip_Bilirubin_mean.style.left = `${percent * 100}%`;
});

const slider_AG_MEAN = document.getElementById("slider_AG_MEAN");
const tooltip_AG_MEAN = document.getElementById("tooltip_AG_MEAN");
slider_AG_MEAN.addEventListener("input", () => {
    tooltip_AG_MEAN.textContent = slider_AG_MEAN.value;
    const percent = (slider_AG_MEAN.value - slider_AG_MEAN.min) / (slider_AG_MEAN.max - slider_AG_MEAN.min);
    tooltip_AG_MEAN.style.left = `${percent * 100}%`;
});

const slider_AG_MAX = document.getElementById("slider_AG_MAX");
const tooltip_AG_MAX = document.getElementById("tooltip_AG_MAX");
slider_AG_MAX.addEventListener("input", () => {
    tooltip_AG_MAX.textContent = slider_AG_MAX.value;
    const percent = (slider_AG_MAX.value - slider_AG_MAX.min) / (slider_AG_MAX.max - slider_AG_MAX.min);
    tooltip_AG_MAX.style.left = `${percent * 100}%`;
});

const slider_AG_MEDIAN = document.getElementById("slider_AG_MEDIAN");
const tooltip_AG_MEDIAN = document.getElementById("tooltip_AG_MEDIAN");
slider_AG_MEDIAN.addEventListener("input", () => {
    tooltip_AG_MEDIAN.textContent = slider_AG_MEDIAN.value;
    const percent = (slider_AG_MEDIAN.value - slider_AG_MEDIAN.min) / (slider_AG_MEDIAN.max - slider_AG_MEDIAN.min);
    tooltip_AG_MEDIAN.style.left = `${percent * 100}%`;
});

const slider_AG_MIN = document.getElementById("slider_AG_MIN");
const tooltip_AG_MIN = document.getElementById("tooltip_AG_MIN");
slider_AG_MIN.addEventListener("input", () => {
    tooltip_AG_MIN.textContent = slider_AG_MIN.value;
    const percent = (slider_AG_MIN.value - slider_AG_MIN.min) / (slider_AG_MIN.max - slider_AG_MIN.min);
    tooltip_AG_MIN.style.left = `${percent * 100}%`;
});

const slider_AG_STD = document.getElementById("slider_AG_STD");
const tooltip_AG_STD = document.getElementById("tooltip_AG_STD");
slider_AG_STD.addEventListener("input", () => {
    tooltip_AG_STD.textContent = slider_AG_STD.value;
    const percent = (slider_AG_STD.value - slider_AG_STD.min) / (slider_AG_STD.max - slider_AG_STD.min);
    tooltip_AG_STD.style.left = `${percent * 100}%`;
});

const slider_SYSBP_MIN = document.getElementById("slider_SYSBP_MIN");
const tooltip_SYSBP_MIN = document.getElementById("tooltip_SYSBP_MIN");
slider_SYSBP_MIN.addEventListener("input", () => {
    tooltip_SYSBP_MIN.textContent = slider_SYSBP_MIN.value;
    const percent = (slider_SYSBP_MIN.value - slider_SYSBP_MIN.min) / (slider_SYSBP_MIN.max - slider_SYSBP_MIN.min);
    tooltip_SYSBP_MIN.style.left = `${percent * 100}%`;
});

const slider_SYSBP_MEAN = document.getElementById("slider_SYSBP_MEAN");
const tooltip_SYSBP_MEAN = document.getElementById("tooltip_SYSBP_MEAN");
slider_SYSBP_MEAN.addEventListener("input", () => {
    tooltip_SYSBP_MEAN.textContent = slider_SYSBP_MEAN.value;
    const percent = (slider_SYSBP_MEAN.value - slider_SYSBP_MEAN.min) / (slider_SYSBP_MEAN.max - slider_SYSBP_MEAN.min);
    tooltip_SYSBP_MEAN.style.left = `${percent * 100}%`;
});

const slider_SYSBP_STD = document.getElementById("slider_SYSBP_STD");
const tooltip_SYSBP_STD = document.getElementById("tooltip_SYSBP_STD");
slider_SYSBP_STD.addEventListener("input", () => {
    tooltip_SYSBP_STD.textContent = slider_SYSBP_STD.value;
    const percent = (slider_SYSBP_STD.value - slider_SYSBP_STD.min) / (slider_SYSBP_STD.max - slider_SYSBP_STD.min);
    tooltip_SYSBP_STD.style.left = `${percent * 100}%`;
});


const slider_DIASBP_MIN = document.getElementById("slider_DIASBP_MIN");
const tooltip_DIASBP_MIN = document.getElementById("tooltip_DIASBP_MIN");
slider_DIASBP_MIN.addEventListener("input", () => {
    tooltip_DIASBP_MIN.textContent = slider_DIASBP_MIN.value;
    const percent = (slider_DIASBP_MIN.value - slider_DIASBP_MIN.min) / (slider_DIASBP_MIN.max - slider_DIASBP_MIN.min);
    tooltip_DIASBP_MIN.style.left = `${percent * 100}%`;
});

const slider_DIASBP_MEAN = document.getElementById("slider_DIASBP_MEAN");
const tooltip_DIASBP_MEAN = document.getElementById("tooltip_DIASBP_MEAN");
slider_DIASBP_MEAN.addEventListener("input", () => {
    tooltip_DIASBP_MEAN.textContent = slider_DIASBP_MEAN.value;
    const percent = (slider_DIASBP_MEAN.value - slider_DIASBP_MEAN.min) / (slider_DIASBP_MEAN.max - slider_DIASBP_MEAN.min);
    tooltip_DIASBP_MEAN.style.left = `${percent * 100}%`;
});

const slider_RR_MEAN = document.getElementById("slider_RR_MEAN");
const tooltip_RR_MEAN = document.getElementById("tooltip_RR_MEAN");
slider_RR_MEAN.addEventListener("input", () => {
    tooltip_RR_MEAN.textContent = slider_RR_MEAN.value;
    const percent = (slider_RR_MEAN.value - slider_RR_MEAN.min) / (slider_RR_MEAN.max - slider_RR_MEAN.min);
    tooltip_RR_MEAN.style.left = `${percent * 100}%`;
});

const slider_RR_STD = document.getElementById("slider_RR_STD");
const tooltip_RR_STD = document.getElementById("tooltip_RR_STD");
slider_RR_STD.addEventListener("input", () => {
    tooltip_RR_STD.textContent = slider_RR_STD.value;
    const percent = (slider_RR_STD.value - slider_RR_STD.min) / (slider_RR_STD.max - slider_RR_STD.min);
    tooltip_RR_STD.style.left = `${percent * 100}%`;
});

const slider_RR_MAX = document.getElementById("slider_RR_MAX");
const tooltip_RR_MAX = document.getElementById("tooltip_RR_MAX");
slider_RR_MAX.addEventListener("input", () => {
    tooltip_RR_MAX.textContent = slider_RR_MAX.value;
    const percent = (slider_RR_MAX.value - slider_RR_MAX.min) / (slider_RR_MAX.max - slider_RR_MAX.min);
    tooltip_RR_MAX.style.left = `${percent * 100}%`;
});

const slider_TEMP_STD = document.getElementById("slider_TEMP_STD");
const tooltip_TEMP_STD = document.getElementById("tooltip_TEMP_STD");
slider_TEMP_STD.addEventListener("input", () => {
    tooltip_TEMP_STD.textContent = slider_TEMP_STD.value;
    const percent = (slider_TEMP_STD.value - slider_TEMP_STD.min) / (slider_TEMP_STD.max - slider_TEMP_STD.min);
    tooltip_TEMP_STD.style.left = `${percent * 100}%`;
});

const slider_TEMP_MIN = document.getElementById("slider_TEMP_MIN");
const tooltip_TEMP_MIN = document.getElementById("tooltip_TEMP_MIN");
slider_TEMP_MIN.addEventListener("input", () => {
    tooltip_TEMP_MIN.textContent = slider_TEMP_MIN.value;
    const percent = (slider_TEMP_MIN.value - slider_TEMP_MIN.min) / (slider_TEMP_MIN.max - slider_TEMP_MIN.min);
    tooltip_TEMP_MIN.style.left = `${percent * 100}%`;
});

const slider_HR_MEAN = document.getElementById("slider_HR_MEAN");
const tooltip_HR_MEAN = document.getElementById("tooltip_HR_MEAN");
slider_HR_MEAN.addEventListener("input", () => {
    tooltip_HR_MEAN.textContent = slider_HR_MEAN.value;
    const percent = (slider_HR_MEAN.value - slider_HR_MEAN.min) / (slider_HR_MEAN.max - slider_HR_MEAN.min);
    tooltip_HR_MEAN.style.left = `${percent * 100}%`;
});

const slider_HR_MAX = document.getElementById("slider_HR_MAX");
const tooltip_HR_MAX = document.getElementById("tooltip_HR_MAX");
slider_HR_MAX.addEventListener("input", () => {
    tooltip_HR_MAX.textContent = slider_HR_MAX.value;
    const percent = (slider_HR_MAX.value - slider_HR_MAX.min) / (slider_HR_MAX.max - slider_HR_MAX.min);
    tooltip_HR_MAX.style.left = `${percent * 100}%`;
});

const slider_age_adj_comorbidity_score = document.getElementById("slider_age_adj_comorbidity_score");
const tooltip_age_adj_comorbidity_score = document.getElementById("tooltip_age_adj_comorbidity_score");
slider_age_adj_comorbidity_score.addEventListener("input", () => {
    tooltip_age_adj_comorbidity_score.textContent = slider_age_adj_comorbidity_score.value;
    const percent = (slider_age_adj_comorbidity_score.value - slider_age_adj_comorbidity_score.min) / (slider_age_adj_comorbidity_score.max - slider_age_adj_comorbidity_score.min);
    tooltip_age_adj_comorbidity_score.style.left = `${percent * 100}%`;
});


$("#feature_list").on("click", function () {
    $.ajaxSetup({
        headers: {
            'csrfmiddlewaretoken': $("input[name=csrfmiddlewaretoken]").val()
        }
    });
    $.ajax({
        type: "POST", url: window.location.href + "datamanagement/feature_list/", data: {
            diagnosis: $("input[name=diagnosis]").val(),
            age: $("input[name=Age]").val(),
            GCS_max: $("input[name=GCS_max]").val(),
            GCS_mean: $("input[name=GCS_mean]").val(),
            Lactate_min: $("input[name=Lactate_min]").val(),
            Lactate_max: $("input[name=Lactate_max]").val(),
            Lactate_mean: $("input[name=Lactate_mean]").val(),
            BUN_min: $("input[name=BUN_min]").val(),
            BUN_mean: $("input[name=BUN_mean]").val(),
            AG_max: $("input[name=AG_max]").val(),
            AG_mean: $("input[name=AG_mean]").val(),
            Bilirubin_max: $("input[name=Bilirubin_max]").val(),
            Bilirubin_mean: $("input[name=Bilirubin_mean]").val(),
            AG_MEAN: $("input[name=AG_MEAN]").val(),
            AG_MAX: $("input[name=AG_MAX]").val(),
            AG_MEDIAN: $("input[name=AG_MEDIAN]").val(),
            AG_MIN: $("input[name=AG_MIN]").val(),
            AG_STD: $("input[name=AG_STD]").val(),
            SYSBP_MIN: $("input[name=SYSBP_MIN]").val(),
            SYSBP_MEAN: $("input[name=SYSBP_MEAN]").val(),
            SYSBP_STD: $("input[name=SYSBP_STD]").val(),
            DIASBP_MIN: $("input[name=DIASBP_MIN]").val(),
            DIASBP_MEAN: $("input[name=DIASBP_MEAN]").val(),
            RR_MEAN: $("input[name=RR_MEAN]").val(),
            RR_STD: $("input[name=RR_STD]").val(),
            RR_MAX: $("input[name=RR_MAX]").val(),
            TEMP_STD: $("input[name=TEMP_STD]").val(),
            TEMP_MIN: $("input[name=TEMP_MIN]").val(),
            HR_MEAN: $("input[name=HR_MEAN]").val(),
            HR_MAX: $("input[name=HR_MAX]").val(),
            age_adj_comorbidity_score: $("input[name=age_adj_comorbidity_score]").val(),

            csrfmiddlewaretoken: $("input[name=csrfmiddlewaretoken]").val()
        }, dataType: "json", success: function (json_data) {
            console.log(json_data.prediction);

            const container_prediction = document.getElementById("container_prediction");
            // check if element id_table exist, yes -> insert element on table
            // no -> create new element table

            // check if element table does not exist?
            if (document.getElementById("table_prediction")) {
                document.getElementById("table_prediction").remove();
                document.getElementById("fieldset_prediction").remove();
                document.getElementById("div_explainability").remove();

            }

            // Create table element
            const table_prediction = document.createElement("table");
            table_prediction.setAttribute("id", "table_prediction");
            table_prediction.classList.add("my-table");

            // Create header row
            const headerRow = document.createElement("tr");
            const modelHeader = document.createElement("th");
            modelHeader.textContent = "Model";
            headerRow.appendChild(modelHeader);
            const valueHeader = document.createElement("th");
            valueHeader.textContent = "Prediction (%)";
            headerRow.appendChild(valueHeader);
            table_prediction.appendChild(headerRow);
            // Loop through JSON and create rows
            for (const key in json_data.prediction) {
                const row = document.createElement("tr");
                const modelCell = document.createElement("td");
                modelCell.textContent = key;
                const valueCell = document.createElement("td");
                valueCell.textContent = (json_data.prediction[key] * 100).toFixed(2) + " %";
                row.appendChild(modelCell);
                row.appendChild(valueCell);
                table_prediction.appendChild(row);
            }
            // Append table to a container
            container_prediction.appendChild(table_prediction);

            // Create the radio input
            const container_prediction_radio = document.getElementById("container_prediction_radio");
            // Create fieldset
            const fieldset = document.createElement("fieldset");
            fieldset.setAttribute("id", "fieldset_prediction")
            // Create legend
            const legend = document.createElement("legend");
            legend.textContent = " Moderate risk bank based on the model output ";
            fieldset.appendChild(legend);
            // First div (radio buttons)
            const div1 = document.createElement("div");

            // Radio options data
            const options = [{id: "low_risk", value: "low_risk", label: "Low Risk"}, {
                id: "middle_risk", value: "middle_risk", label: "Middle Risk"
            }, {id: "high_risk", value: "high_risk", label: "High Risk"}]; // Create radios + labels
            options.forEach(opt => {
                const input = document.createElement("input");
                input.type = "radio";
                input.id = opt.id;
                input.name = "prediction_risk";
                input.value = opt.value;
                const label = document.createElement("label");
                label.setAttribute("for", opt.id);
                label.textContent = opt.label;
                label.setAttribute("style", "margin-left: 5px;");
                label.setAttribute("style", "margin-right: 20px;");
                div1.appendChild(input);
                div1.appendChild(label);
            });
            div1.classList.add("fieldset_model");
            fieldset.appendChild(div1);

            container_prediction_radio.appendChild(fieldset);
            const xgb = json_data.prediction['XGBoost'] * 100;

            if (xgb > 80) {
                document.getElementById('high_risk').style.accentColor = "rgb(246, 51, 102)";
                document.getElementById('high_risk').checked = true;
            } else if (xgb < 40) {

                document.getElementById('low_risk').style.accentColor = "green";
                document.getElementById('low_risk').checked = true;
            } else {
                document.getElementById('middle_risk').style.accentColor = "yellow";
                document.getElementById('middle_risk').checked = true;
            }

            // show the resutl of the explainability as image
            const container_explainability = document.getElementById('container_explainability');

            const div_explainability = document.createElement('div');
            div_explainability.setAttribute('id', 'div_explainability');
            const img = document.createElement("img");
            img.src = "http://localhost:8000/static/imgs/shap_summary.png";   // path to your saved image
            img.alt = "SHAP Summary Plot";
            img.style.width = "40%";              // optional

            div_explainability.appendChild(img);
            container_explainability.appendChild(div_explainability);


        }, error: function (data) {

        }
    });
});

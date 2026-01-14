document.querySelectorAll('.stTabs-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // deactivate all buttons
        document.querySelectorAll('.stTabs-button')
            .forEach(b => b.classList.remove('is-active'));

        // hide all panels
        document.querySelectorAll('.stTabs-panel')
            .forEach(p => p.classList.remove('is-active'));

        // activate clicked tab and panel
        btn.classList.add('is-active');
        document.getElementById(tabId).classList.add('is-active');
    });
});

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

function split_date(date_element) {
    const item_value = new Date(date_element);
    const year = item_value.getFullYear();
    const month = String(item_value.getMonth() + 1).padStart(2, '0');
    const day = String(item_value.getDate()).padStart(2, '0');
    const formatted = `${day}-${month}-${year}`;
    return formatted;
}

function cutTo3(num) {
    return Math.trunc(num * 1000) / 1000;
}




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
            console.log(json_data);

            if (json_data.data_lenght === 0) {
                displayMessage("warning", "subject_id '" + json_data.subject_id + "' not found!");

            }


            const data = JSON.parse(json_data.data);

            if (document.getElementById("patient_container")) {
                document.getElementById("patient_container").remove();
            }
            const container = document.getElementById("tableContainer");


            // create element patient_container
            const patient_container = document.createElement('div');
            patient_container.setAttribute('id', 'patient_container');
            const rowKeys = Object.keys(data.Age).sort((a, b) => data.Age[a] - data.Age[b]);
            rowKeys.forEach(key => {

                const subject = data.Subject_id[key];
                const hadm_id = data.Hadm_id[key];
                const diagnosis = data.Diagnosis[key];
                const gender = data.Gender[key];
                const birthday = split_date(data.Birthday[key]);
                const admission = split_date(data.Admission_time[key]);
                const age = data.Age[key];
                const marital = data.Marital_status[key];
                let died;
                if (data.Died[key] === 0) {
                    died = "No";
                } else {
                    died = "Yes";
                }

                // <details>
                const details = document.createElement("details");
                details.style.marginBottom = "10px";



                // <summary>
                const summary = document.createElement("summary");
                summary.style.cursor = "pointer";
                summary.style.fontWeight = "bold";
                summary.textContent = `Subject_id ${subject} — [${hadm_id}], [${age}] year old, [Died:${died}], ${diagnosis}`;
                //summary.style.backgroundColor = "rgb(248, 249, 251)";
                summary.style.borderRadius = "5px";
                summary.classList.add("summary_element");

                details.appendChild(summary);

                // <table>
                const table = document.createElement("table");
                table.border = "1";
                table.style.marginTop = "8px";
                table.classList.add("table_inline");

                // Helper to add rows
                function addRow(label, value) {
                    const tr = document.createElement("tr");
                    const td1 = document.createElement("td");
                    const strong = document.createElement("strong");
                    strong.textContent = label;
                    td1.appendChild(strong);

                    // add style for td element for label like "
                    //td1.style.backgroundColor = "rgb(255, 204, 217)";

                    // end of style td1
                    const td2 = document.createElement("td");
                    td2.textContent = value;
                    tr.appendChild(td1);
                    tr.appendChild(td2);
                    table.appendChild(tr);
                }
                // this element is the container of all the 2 table
                const div_for_table = document.createElement('div');
                div_for_table.style.display = "flex";
                details.appendChild(div_for_table);

                addRow("Subject_id", subject);
                addRow("Hadm_id", hadm_id);
                addRow("Diagnosis", (diagnosis || "").toLowerCase());
                addRow("Gender", gender);
                addRow("Birthday", birthday);
                addRow("Admission_time", admission);
                addRow("Age", age);
                addRow("Marital_status", marital);
                addRow("Died", died);


                div_for_table.appendChild(table);

                const table_model = document.createElement("table");
                table_model.border = "1";
                table_model.style.marginTop = "8px";
                table_model.classList.add("table_inline");
                table_model.style.left = "150px";
                table_model.style.marginLeft = "20px";

                // Create header
                const thead = document.createElement("thead");
                const headerRow = document.createElement("tr");
                ["XGBoost", "XGBoost_90_days", "XGBoost_180_days"].forEach(text => {
                    const th = document.createElement("th");
                    th.textContent = text;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table_model.appendChild(thead);

                // Create body
                const tbody = document.createElement("tbody");

                function addRow_prediction(values) {
                    const tr = document.createElement("tr");
                    values.forEach(val => {
                        const td = document.createElement("td");
                        td.textContent = val; tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                }


                function addRow_table_model(label, value) {
                    const tr = document.createElement("tr");
                    const td1 = document.createElement("td");
                    const strong = document.createElement("strong");
                    strong.textContent = label;
                    td1.appendChild(strong);

                    // add style for td element for label like "
                    //td1.style.backgroundColor = "rgb(255, 204, 217)";

                    // end of style td1
                    const td2 = document.createElement("td");
                    td2.textContent = value;
                    tr.appendChild(td1);
                    tr.appendChild(td2);
                    table_model.appendChild(tr);
                }

                if (json_data.model_detail[hadm_id][0].len_hadm_id_result === 0) {
                    addRow("HADM_ID result ", json_data.model_detail[hadm_id][0].len_hadm_id_result);
                    const div_plot = document.createElement('div');
                    div_plot.setAttribute('id', `shapPlot_${hadm_id}`);
                    div_for_table.appendChild(div_plot);
                    details.appendChild(div_for_table);

                    patient_container.appendChild(details);
                    container.appendChild(patient_container);
                } else {
                    console.log("joan ", cutTo3(json_data.model_detail[hadm_id][0].prediction.XGBoost_90_days));

                    const XGBoost_day = cutTo3(json_data.model_detail[hadm_id][0].prediction.XGBoost);
                    const XGBoost_90_days = cutTo3(json_data.model_detail[hadm_id][0].prediction.XGBoost_90_days);
                    const XGBoost_180_days = cutTo3(json_data.model_detail[hadm_id][0].prediction.XGBoost_180_days);

                    addRow_prediction([XGBoost_day, XGBoost_90_days, XGBoost_180_days]);
                    table_model.appendChild(tbody);
                    div_for_table.appendChild(table_model);
                    details.appendChild(div_for_table);


                    const div_plot = document.createElement('div');
                    div_plot.setAttribute('id', `shapPlot_${hadm_id}`);

                    details.appendChild(div_plot);

                    patient_container.appendChild(details);
                    container.appendChild(patient_container);

                    // begin top contributor for feature that influente the model prediction
                    const table_contributor = document.createElement("table");
                    table_contributor.border = "1";
                    table_contributor.style.marginTop = "8px";

                    // Helper to add rows
                    function addRow_feature(feature_name, feature_value) {
                        const tr = document.createElement("tr");
                        const td1 = document.createElement("td");
                        const strong = document.createElement("strong");
                        strong.textContent = feature_name;
                        td1.appendChild(strong);

                        // add style for td element for label like "
                        //td1.style.backgroundColor = "rgb(255, 204, 217)";

                        // end of style td1
                        const td2 = document.createElement("td");
                        if (feature_value === 0) {
                            td2.textContent = "nan";
                        } else{
                            td2.textContent = feature_value;

                        }
                        tr.appendChild(td1);
                        tr.appendChild(td2);
                        table_contributor.appendChild(tr);
                    }


                    const details_contributor = document.createElement("details");
                    details_contributor.style.marginBottom = "10px";
                    details_contributor.classList.add('table_inline');
                    // <summary>
                    const summary_contributor = document.createElement("summary");
                    summary_contributor.style.cursor = "pointer";
                    summary_contributor.style.fontWeight = "bold";
                    summary_contributor.textContent = `*** Most impactful features and value driving the model’s prediction ***`;
                    //summary.style.backgroundColor = "rgb(248, 249, 251)";
                    summary_contributor.style.borderRadius = "5px";
                    summary_contributor.classList.add("table_inline");

                    details_contributor.appendChild(summary_contributor);
                    let feature_XGBoost = json_data.model_detail[hadm_id][0].frontend_data.XGBoost;
                    let feature_XGBoost_90_days = json_data.model_detail[hadm_id][0].frontend_data.XGBoost_90_days;
                    let feature_XGBoost_180_days = json_data.model_detail[hadm_id][0].frontend_data.XGBio


                    function XGBoost_feature_data (data_feature_XGBoost){
                        data_feature_XGBoost.feature_name.forEach((name, index) => {
                        // save the first 5 item on the table
                        if (index < 5){
                            addRow_feature(data_feature_XGBoost.feature_name[index], cutTo3(data_feature_XGBoost.feature_value[index]));
                        }
                    });
                    }

                    XGBoost_feature_data


                    //details_contributor.appendChild(table_contributor);
                    details.append(details_contributor);


                    // add the plot for every diagnosis of this subject_id
                    const featureNames = json_data.model_detail[hadm_id][0].explainability.XGBoost.feature_names;
                    const shapValues = json_data.model_detail[hadm_id][0].explainability.XGBoost.shap_values;

                    renderShapSummaryPlot(shapValues, featureNames, subject, hadm_id);
                }


            });


        }, error: function (data) {

        }


    });
});


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

slider_Age.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_Age, tooltip_Age);
});

// slider input for age
const slider_GCS_max = document.getElementById("slider_GCS_max");
const tooltip_GCS_max = document.getElementById("tooltip_GCS_max");
slider_GCS_max.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_GCS_max, tooltip_GCS_max);
});

// slider input for age
const slider_GCS_mean = document.getElementById("slider_GCS_mean");
const tooltip_GCS_mean = document.getElementById("tooltip_GCS_mean");
slider_GCS_mean.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_GCS_mean, tooltip_GCS_mean);
});

// slider input for slider_Lactate_min
const slider_Lactate_min = document.getElementById("slider_Lactate_min");
const tooltip_Lactate_min = document.getElementById("tooltip_Lactate_min");
slider_Lactate_min.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_Lactate_min, tooltip_Lactate_min);
});

// slider input for slider_Lactate_min
const slider_Lactate_max = document.getElementById("slider_Lactate_max");
const tooltip_Lactate_max = document.getElementById("tooltip_Lactate_max");
slider_Lactate_max.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_Lactate_max, tooltip_Lactate_max);
});

// slider input for slider_Lactate_min
const slider_Lactate_mean = document.getElementById("slider_Lactate_mean");
const tooltip_Lactate_mean = document.getElementById("tooltip_Lactate_mean");
slider_Lactate_mean.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_Lactate_mean, tooltip_Lactate_mean);
});

const slider_BUN_min = document.getElementById("slider_BUN_min");
const tooltip_BUN_min = document.getElementById("tooltip_BUN_min");
slider_BUN_min.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_BUN_min, tooltip_BUN_min);
});

const slider_BUN_mean = document.getElementById("slider_BUN_mean");
const tooltip_BUN_mean = document.getElementById("tooltip_BUN_mean");
slider_BUN_mean.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_BUN_mean, tooltip_BUN_mean);
});

const slider_Bilirubin_max = document.getElementById("slider_Bilirubin_max");
const tooltip_Bilirubin_max = document.getElementById("tooltip_Bilirubin_max");
slider_Bilirubin_max.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_Bilirubin_max, tooltip_Bilirubin_max);
});

const slider_Bilirubin_mean = document.getElementById("slider_Bilirubin_mean");
const tooltip_Bilirubin_mean = document.getElementById("tooltip_Bilirubin_mean");
slider_Bilirubin_mean.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_Bilirubin_mean, tooltip_Bilirubin_mean);
});

const slider_AG_MEAN = document.getElementById("slider_AG_MEAN");
const tooltip_AG_MEAN = document.getElementById("tooltip_AG_MEAN");
slider_AG_MEAN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_AG_MEAN, tooltip_AG_MEAN);
});

const slider_AG_MAX = document.getElementById("slider_AG_MAX");
const tooltip_AG_MAX = document.getElementById("tooltip_AG_MAX");
slider_AG_MAX.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_AG_MAX, tooltip_AG_MAX);
});



const slider_AG_MIN = document.getElementById("slider_AG_MIN");
const tooltip_AG_MIN = document.getElementById("tooltip_AG_MIN");
slider_AG_MIN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_AG_MIN, tooltip_AG_MIN);
});

const slider_AG_STD = document.getElementById("slider_AG_STD");
const tooltip_AG_STD = document.getElementById("tooltip_AG_STD");
slider_AG_STD.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_AG_STD, tooltip_AG_STD);
});

const slider_SYSBP_MIN = document.getElementById("slider_SYSBP_MIN");
const tooltip_SYSBP_MIN = document.getElementById("tooltip_SYSBP_MIN");
slider_SYSBP_MIN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_SYSBP_MIN, tooltip_SYSBP_MIN);
});

const slider_SYSBP_MEAN = document.getElementById("slider_SYSBP_MEAN");
const tooltip_SYSBP_MEAN = document.getElementById("tooltip_SYSBP_MEAN");
slider_SYSBP_MEAN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_SYSBP_MEAN, tooltip_SYSBP_MEAN);
});

const slider_SYSBP_STD = document.getElementById("slider_SYSBP_STD");
const tooltip_SYSBP_STD = document.getElementById("tooltip_SYSBP_STD");
slider_SYSBP_STD.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_SYSBP_STD, tooltip_SYSBP_STD);
});


const slider_DIASBP_MIN = document.getElementById("slider_DIASBP_MIN");
const tooltip_DIASBP_MIN = document.getElementById("tooltip_DIASBP_MIN");
slider_DIASBP_MIN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_DIASBP_MIN, tooltip_DIASBP_MIN);
});

const slider_DIASBP_MEAN = document.getElementById("slider_DIASBP_MEAN");
const tooltip_DIASBP_MEAN = document.getElementById("tooltip_DIASBP_MEAN");
slider_DIASBP_MEAN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_DIASBP_MEAN, tooltip_DIASBP_MEAN);
});

const slider_RR_MEAN = document.getElementById("slider_RR_MEAN");
const tooltip_RR_MEAN = document.getElementById("tooltip_RR_MEAN");
slider_RR_MEAN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_RR_MEAN, tooltip_RR_MEAN);
});



const slider_RR_MAX = document.getElementById("slider_RR_MAX");
const tooltip_RR_MAX = document.getElementById("tooltip_RR_MAX");
slider_RR_MAX.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_RR_MAX, tooltip_RR_MAX);
});

const slider_RR_MIN = document.getElementById("slider_RR_MIN");
const tooltip_RR_MIN = document.getElementById("tooltip_RR_MIN");
slider_RR_MIN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_RR_MIN, tooltip_RR_MIN);
});

const slider_TEMP_STD = document.getElementById("slider_TEMP_STD");
const tooltip_TEMP_STD = document.getElementById("tooltip_TEMP_STD");
slider_TEMP_STD.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_TEMP_STD, tooltip_TEMP_STD);
});

const slider_TEMP_MIN = document.getElementById("slider_TEMP_MIN");
const tooltip_TEMP_MIN = document.getElementById("tooltip_TEMP_MIN");
slider_TEMP_MIN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_TEMP_MIN, tooltip_TEMP_MIN);
});

const slider_HR_MEAN = document.getElementById("slider_HR_MEAN");
const tooltip_HR_MEAN = document.getElementById("tooltip_HR_MEAN");
slider_HR_MEAN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_HR_MEAN, tooltip_HR_MEAN);
});

const slider_HR_MAX = document.getElementById("slider_HR_MAX");
const tooltip_HR_MAX = document.getElementById("tooltip_HR_MAX");
slider_HR_MAX.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_HR_MAX, tooltip_HR_MAX);
});

const slider_HR_STD = document.getElementById("slider_HR_STD");
const tooltip_HR_STD = document.getElementById("tooltip_HR_STD");
slider_HR_STD.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_HR_STD, tooltip_HR_STD);
});

const slider_RDW_max = document.getElementById("slider_RDW_max");
const tooltip_RDW_max = document.getElementById("tooltip_RDW_max");
slider_RDW_max.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_RDW_max, tooltip_RDW_max);
});

const slider_RDW_mean = document.getElementById("slider_RDW_mean");
const tooltip_RDW_mean = document.getElementById("tooltip_RDW_mean");
slider_RDW_mean.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_RDW_mean, tooltip_RDW_mean);
});

const slider_RDW_min = document.getElementById("slider_RDW_min");
const tooltip_RDW_min = document.getElementById("tooltip_RDW_min");
slider_RDW_min.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_RDW_min, tooltip_RDW_min);
});

const slider_RDW_std = document.getElementById("slider_RDW_std");
const tooltip_RDW_std = document.getElementById("tooltip_RDW_std");
slider_RDW_std.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_RDW_std, tooltip_RDW_std);
});

const slider_age_adj_comorbidity_score = document.getElementById("slider_age_adj_comorbidity_score");
const tooltip_age_adj_comorbidity_score = document.getElementById("tooltip_age_adj_comorbidity_score");
slider_age_adj_comorbidity_score.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_age_adj_comorbidity_score, tooltip_age_adj_comorbidity_score);
    //slider_age_adj_comorbidity_score.style.background = `linear-gradient( to right, #22c55e 0%, #22c55e ${percent * 100}%, #1f2937 ${percent * 100}%, #1f2937 100% )`;

});

const slider_MEANBP_MEAN = document.getElementById("slider_MEANBP_MEAN");
const tooltip_MEANBP_MEAN = document.getElementById("tooltip_MEANBP_MEAN");
slider_MEANBP_MEAN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_MEANBP_MEAN, tooltip_MEANBP_MEAN);
});

const slider_MEANBP_MIN = document.getElementById("slider_MEANBP_MIN");
const tooltip_MEANBP_MIN = document.getElementById("tooltip_MEANBP_MIN");
slider_MEANBP_MIN.addEventListener("input", e => {
    const percent = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
    e.target.style.setProperty("--value", percent + "%");
    move_input_range(slider_MEANBP_MIN, tooltip_MEANBP_MIN);
});
function move_input_range(slider, tooltip) {
    "use strict";
    tooltip.textContent = slider.value;
    const percent = (slider.value - slider.min) / (slider.max - slider.min);
    tooltip.style.left = `${percent * 100}%`;

}

$("#feature_list").on("click", function () {

    $.ajaxSetup({
        headers: {
            'csrfmiddlewaretoken': $("input[name=csrfmiddlewaretoken]").val()
        }
    });
    $.ajax({
        type: "POST", url: window.location.href + "datamangement/feature_list/", data: {
            diagnosis: $("input[name=diagnosis]").val(),
            AGE: $("input[name=Age]").val(),
            GCS_max: $("input[name=GCS_max]").val(),
            GCS_mean: $("input[name=GCS_mean]").val(),
            Lactate_min: $("input[name=Lactate_min]").val(),
            Lactate_max: $("input[name=Lactate_max]").val(),
            Lactate_mean: $("input[name=Lactate_mean]").val(),
            BUN_min: $("input[name=BUN_min]").val(),
            BUN_mean: $("input[name=BUN_mean]").val(),
            Bilirubin_max: $("input[name=Bilirubin_max]").val(),
            Bilirubin_mean: $("input[name=Bilirubin_mean]").val(),
            AG_MEAN: $("input[name=AG_MEAN]").val(),
            AG_MAX: $("input[name=AG_MAX]").val(),
            AG_MIN: $("input[name=AG_MIN]").val(),
            AG_STD: $("input[name=AG_STD]").val(),
            SYSBP_MIN: $("input[name=SYSBP_MIN]").val(),
            SYSBP_MEAN: $("input[name=SYSBP_MEAN]").val(),
            SYSBP_STD: $("input[name=SYSBP_STD]").val(),
            DIASBP_MIN: $("input[name=DIASBP_MIN]").val(),
            DIASBP_MEAN: $("input[name=DIASBP_MEAN]").val(),
            RR_MEAN: $("input[name=RR_MEAN]").val(),
            RR_MAX: $("input[name=RR_MAX]").val(),
            RR_MIN: $("input[name=RR_MIN]").val(),
            TEMP_STD: $("input[name=TEMP_STD]").val(),
            TEMP_MIN: $("input[name=TEMP_MIN]").val(),
            HR_MEAN: $("input[name=HR_MEAN]").val(),
            HR_MAX: $("input[name=HR_MAX]").val(),
            HR_STD: $("input[name=HR_STD]").val(),
            RDW_max: $("input[name=RDW_max]").val(),
            RDW_mean: $("input[name=RDW_mean]").val(),
            RDW_min: $("input[name=RDW_min]").val(),
            RDW_std: $("input[name=RDW_std]").val(),
            age_adj_comorbidity_score: $("input[name=age_adj_comorbidity_score]").val(),
            MEANBP_MEAN: $("input[name=MEANBP_MEAN]").val(),
            MEANBP_MIN: $("input[name=MEANBP_MIN]").val(),

            csrfmiddlewaretoken: $("input[name=csrfmiddlewaretoken]").val()
        }, dataType: "json", success: function (json_data) {
            console.log(json_data.prediction);
            console.log(json_data.explainability);
            console.log(json_data.frontend_data);
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

            /*
            const img = new Image();
            img.src = "http://localhost:8000/static/imgs/shap_summary.png";   // path to your saved image
            img.alt = "SHAP Summary Plot";
            img.style.width = "40%";             // optional
            img.id = "img_explainability";
            div_explainability.appendChild(img);
            */

            // add table of real feature and value
            // <details>

            const details = document.createElement("details");
            details.style.marginBottom = "10px";
            // <summary>
            const summary = document.createElement("summary");
            summary.style.cursor = "pointer";
            summary.style.fontWeight = "bold";
            summary.textContent = `Top Features and value that influence the output of the model. `;
            //summary.style.backgroundColor = "rgb(248, 249, 251)";
            summary.style.borderRadius = "5px";
            summary.classList.add("summary_element");
            details.appendChild(summary);

            // <table>
            const table = document.createElement("table");
            table.border = "1";
            table.style.marginTop = "8px";

            // Helper to add rows
            function addRow(feature_name, feature_value) {

                const tr = document.createElement("tr");
                const td1 = document.createElement("td");
                const strong = document.createElement("strong");
                strong.textContent = feature_name;
                td1.appendChild(strong);

                // add style for td element for label like "
                //td1.style.backgroundColor = "rgb(255, 204, 217)";

                // end of style td1
                const td2 = document.createElement("td");
                td2.textContent = feature_value;
                tr.appendChild(td1);
                tr.appendChild(td2);
                table.appendChild(tr);
            }
            const data_feature = json_data.frontend_data;
            console.log(data_feature);
            const div_row = document.createElement('div');
            div_row.classList.add('row');

            data_feature.feature_name.forEach((name, index) => {
                // save the first 10 item on the table
                if (index < 10) {
                    addRow(data_feature.feature_name[index], data_feature.feature_value[index]);
                }
            });
            details.appendChild(table);

            // Build each column from JSON

            div_explainability.appendChild(details);

            // 1. Convert JSON → array of objects

            // Append to page
            container_explainability.appendChild(div_explainability);

            // Mock data resembling SHAP summary plot
            const featureNames = json_data.explainability.XGBoost.feature_names;
            const shapValues = json_data.explainability.XGBoost.shap_values;

            const trace = {
                x: shapValues,
                y: featureNames,
                mode: 'markers',
                type: 'scatter',
                marker: {
                    size: 10,
                    color: shapValues,
                    colorscale: [
                        [0, 'rgb(255, 8, 0)'], // start color
                        [1, 'rgb(0, 0, 255)'] // end color (blue)
                    ],
                    reversescale: true,
                    colorbar: {
                        title: 'high shap value'
                    }
                }
            };
            const layout = {

                height: 550,
                title: {
                    text: `SHAP Summary Plot`,
                    font: {size: 12}
                },
                xaxis: {
                    title: {text: 'SHAP Value (Impact on Model Output)', font: {size: 12}},
                    tickfont: {size: 10}
                }, yaxis: {
                    title: {text: 'Feature', font: {size: 12}},
                    tickfont: {size: 9},
                    type: 'category',
                    automargin: true
                }, margin: {
                    l: 150,
                    r: 50,
                    t: 50,
                    b: 50
                },


            };
            //
            Plotly.newPlot('shapPlot', [trace], layout, {responsive: true});

            const combined = featureNames.map((name, i) => ({
                feature: name,
                shap: shapValues[i]
            })); // Sort descending by SHAP value
            combined.sort((a, b) => b.shap - a.shap);
            console.log(combined);

        }, error: function (data) {

        }
    });
});

function renderShapSummaryPlot(shapValues, featureNames, subject, hadm_id) {

    const trace = {
        x: shapValues,
        y: featureNames,
        mode: 'markers',
        type: 'scatter',
        marker: {
            size: 7,
            color: shapValues,
            colorscale: [
                [0, 'rgb(255, 8, 0)'],   // red
                [1, 'rgb(0, 0, 255)']    // blue
            ],
            cmin: Math.min(...shapValues),
            cmax: Math.max(...shapValues),
            reversescale: true,
            colorbar: {
                title: {
                    text: 'Low ← SHAP Value → High',
                    font: { size: 11 }
                }
            },
            tickmode: 'array',
            tickvals: [
                Math.min(...shapValues),
                Math.max(...shapValues)
            ],
            ticktext: ['Low', '0', 'High'],
            ticks: 'outside',
            len: 0.8,
            thickness: 1,
            thicknessmode: 'pixels',
            outlinewidth: 0,
            borderwidth: 0,
            bgcolor: 'rgba(0,0,0,0)'
        }
    };

    const layout = {
        height: 550,
        title: {
            text: `SHAP Summary Plot of Subject_id [${subject}], HADM_ID [${hadm_id}]`,
            font: { size: 12 }
        },
        xaxis: {
            title: { text: 'SHAP Value (Impact on Model Output)', font: { size: 12 } },
            tickfont: { size: 10 }
        },
        yaxis: {
            title: { text: 'Feature', font: { size: 12 } },
            tickfont: { size: 9 },
            type: 'category',
            automargin: true
        },
        margin: {
            l: 150,
            r: 50,
            t: 50,
            b: 50
        }
    };

    Plotly.newPlot(`shapPlot_${hadm_id}`, [trace], layout, { responsive: true });
}



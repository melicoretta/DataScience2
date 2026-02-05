var patients;
document.querySelectorAll("td.value").forEach(td => {
    const num = parseFloat(td.textContent.replace("%", ""));
    if (num > 75) {
        td.classList.add("high-risk");
    } else if (num > 50) {
        td.classList.add("medium-risk");
    } else {
        td.classList.add("low-risk");
    }
});

// by searching a subject_id and display the information about the subject_id, we want to check, if the element
// if the element exist on the screen and change
const dropdown = document.getElementById('myDropdown');
if (dropdown) {
    // Add event listener for value changes
    dropdown.addEventListener('change', function () {
        console.log("Dropdown value changed to:", this.value);
     // Add your logic here
    });
} else {
    console.log("Dropdown element with id 'myDropdown' does not exist.");
}



document.querySelectorAll(".patient-table td.value").forEach(td => {
    const num = parseFloat(td.textContent.replace("%", ""));
    if (num > 75) {
        td.classList.add("high-risk");
    } else if (num > 50) {
        td.classList.add("medium-risk");
    } else {
        td.classList.add("low-risk");
    }
});
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
                console.log(data);

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


$("#input_new_patient_id").autocomplete({
    source: function (request, response) {
        $.ajax({
            url: window.location.href + "datamanagement/search_new_patient/", dataType: "json",
            data: {
                term: request.term,

            }, success: function (response_new_patient) {



                // map only the value on array
                const new_patient_json = JSON.parse(response_new_patient);
                const patient_arr = Object.values(new_patient_json);

                const input = document.getElementById("input_new_patient_id");
                const list = document.getElementById("list_new_patient_id");
                updateList(patient_arr, list, input);

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

function cutTo2(num) {
    return Math.trunc(num * 100) / 100;
}


function addRow_feature(feature_name, feature_value, table_contributor) {

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
    } else {

        td2.textContent = feature_value;

    }
    tr.appendChild(td1);
    tr.appendChild(td2);
    table_contributor.appendChild(tr);
}
function addRow(label, value, table_element) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = label;
    td1.appendChild(strong);

    // add style for td element for label like "
    //td1.style.backgroundColor = "rgb(255, 204, 217)";
    const td2 = document.createElement("td");
    if (String(value).includes("%")) {

        const num = parseFloat(String(value).replace("%", ""));
        const div_element = document.createElement('div');
        div_element.textContent = value;
        if (num > 75) {
            div_element.classList.add("high-risk");
            //td2.classList.add("high-risk");
        } else if (num > 55) {
            div_element.classList.add("medium-risk");
            //td2.classList.add("medium-risk");
        } else {
            div_element.classList.add("low-risk");
            //td2.classList.add("low-risk");
        }
        td2.appendChild(div_element);

    } else {
        td2.textContent = value;
    }
    // end of style td1


    tr.appendChild(td1);


    tr.appendChild(td2);
    table_element.appendChild(tr);
}

function table_explainability(table_contributor, feature_name, feature_value) {

    feature_name.forEach((name, index) => {
        if (index < 10) {
            addRow_feature(name, cutTo3(feature_value[index]), table_contributor);
        }
    });

}

function top_contributor_title(title, div_element) {
    const top_contributor_h7 = document.createElement('h7');
    top_contributor_h7.textContent = `Top 10 Clinical Variables With the Highest Impact on the ${title} Prediction`;
    div_element.appendChild(top_contributor_h7);
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
            const patient_data = JSON.parse(json_data.patient_data);

            // remove element by classname
            const medical_info = document.getElementsByClassName('medical_info');
            if (medical_info) {
                while (medical_info.length > 0) {
                    medical_info[0].remove();
                    document.getElementById('section_model_prediction').remove();
                }
            }
            if (document.getElementById("patient_container")) {
                //document.getElementById("patient_container").remove();
            }
            const model_detail = json_data.model_detail;

            const container = document.getElementById("tableContainer");
            const dropdown_element = create_dropdown(model_detail, patient_data.Subject_id);

            container.appendChild(dropdown_element);


            // create element patient_container
            const patient_container = document.getElementById('patient_container');
            const patient_info = document.getElementById('patient_info');


            const subject = patient_data.Subject_id;
            const hadm_id = patient_data.Hadm_id;
            const diagnosis = patient_data.Diagnosis;
            const gender = patient_data.Gender;
            const birthday = split_date(patient_data.Birthday);
            const admission = split_date(patient_data.Admission_time);
            const age = patient_data.Age;
            const marital = patient_data.Marital_status;
            const language = patient_data.Language;
            const insurance = patient_data.Insurance;
            const religion = patient_data.Religion;
            let died;
            if (patient_data.Died === 0) {
                died = "No";
            } else {
                died = "Yes";
            }

            // <details>
            const section_details = document.getElementById("section_details");
            section_details.style.marginBottom = "10px";
            section_details.style.boxShadow = "0px 0px 40px 0px rgba(0, 0, 0, 0.15)";
            section_details.style.width = "400px";
            section_details.style.border = "1px solid";
            section_details.style.borderRadius = "5px";
            section_details.style.paddingLeft = "5px";
            section_details.style.paddingRight = "5px";
            section_details.style.borderColor = "rgb(240, 242, 246)";

            /* <summary>
            const div_summary = document.createElement("div");
            div_summary.style.cursor = "pointer";
            div_summary.style.fontWeight = "bold";
            div_summary.textContent = `Subject_id ${subject} — [${hadm_id}], [${age}] year old, [Died:${died}], ${diagnosis}`;
            //summary.style.backgroundColor = "rgb(248, 249, 251)";
            div_summary.style.borderRadius = "5px";
            div_summary.classList.add("summary_element");
            section_details.appendChild(div_summary);
            */

            // <table>
            // information about the patient

            // add header


            const table_patient_info = document.createElement("table");
            table_patient_info.style.border = "none";
            table_patient_info.style.marginTop = "8px";
            table_patient_info.style.marginRight = "10px";
            table_patient_info.classList.add("table_inline");


            // Helper to add rows


            // this element is the container of all the 2 table
            const tab_personal_info = document.getElementById('personal_info');

            if (tab_personal_info){
                while (tab_personal_info.firstChild) {
                    tab_personal_info.removeChild(tab_personal_info.firstChild); }
            }

            addRow("Subject_id", subject, table_patient_info);
            addRow("Age", age, table_patient_info);
            addRow("Birthday", birthday, table_patient_info);
            addRow("Gender", gender, table_patient_info);
            addRow("Marital_status", marital, table_patient_info);
            addRow("Language", language, table_patient_info);
            addRow("Religion", religion, table_patient_info);


            tab_personal_info.appendChild(table_patient_info);
            section_details.appendChild(tab_personal_info);


            const diagnosis_data = document.getElementById('diagnosis_data');
            const table_patient_diagnosis = document.createElement('table');
            table_patient_diagnosis.classList.add('medical_info');
            table_patient_diagnosis.style.border = "none";
            table_patient_diagnosis.style.marginTop = "8px";
            table_patient_diagnosis.style.marginRight = "10px";

            // insert element to table
            addRow("Hospital admission_id", hadm_id, table_patient_diagnosis);
            addRow("Admission_time", admission, table_patient_diagnosis);
            addRow("Insurance", insurance, table_patient_diagnosis);
            addRow("Diagnosis", (diagnosis || "").toLowerCase(), table_patient_diagnosis);
            addRow("Died", died, table_patient_diagnosis);

            // content about model for the prediction
            if(document.getElementById('p_error_available')) {
                    document.getElementById('p_error_available').remove();
            }
            if (json_data.model_detail[hadm_id][0].len_hadm_id_result === 0) {

                const p_available = document.createElement('p');
                p_available.setAttribute('id', 'p_error_available');
                p_available.textContent = `There no Data available with the last Hospital admission ${hadm_id}`;
                diagnosis_data.appendChild(p_available);

            } else {
                console.log("false Coretta");
                const model_prediction = json_data.model_detail[hadm_id][0].prediction;
                addRow("Prediction", `${cutTo2(model_prediction.XGBoost)}%`, table_patient_diagnosis);
                addRow("Prediction after 90 days", `${cutTo2(model_prediction.XGBoost_90_days)}%`, table_patient_diagnosis);
                addRow("Prediction after 180 days", `${cutTo2(model_prediction.XGBoost_180_days)}%`, table_patient_diagnosis);

                diagnosis_data.appendChild(table_patient_diagnosis);
                const model_name = ['XGBoost', 'XGBoost_90_days', 'XGBoost_180_days'];

                // plot for the XGBoost
                const section_model_prediction = document.createElement('div');
                section_model_prediction.setAttribute('id', 'section_model_prediction');
                section_model_prediction.classList.add('section_model_prediction');

                const div_header_XGBoost = document.createElement('div');
                div_header_XGBoost.style.backgroundColor = "white";

                const header_XGBoost_h3 = document.createElement('h3');
                header_XGBoost_h3.textContent = "Prediction";
                div_header_XGBoost.appendChild(header_XGBoost_h3);

                const header_XGBoost_h7 = document.createElement('h7');
                header_XGBoost_h7.textContent = "Actual Prediction";
                header_XGBoost_h7.style.color = "grey";
                div_header_XGBoost.appendChild(header_XGBoost_h7);

                const separator_plot_XGBoost = document.createElement('div');
                separator_plot_XGBoost.classList.add('seperator');
                div_header_XGBoost.appendChild(separator_plot_XGBoost);

                section_model_prediction.appendChild(div_header_XGBoost);

                const div_section_model = document.createElement('div');
                div_section_model.style.display = "flex";
                div_section_model.style.flexDirection = "row";

                // top model contributor
                // create element table for contributor



                function table_contributor(title, hadm_id, model_name) {
                    const div_table_contributor = document.createElement('div');
                    div_table_contributor.style.display = "flex";
                    div_table_contributor.style.flexDirection = "column";
                    div_table_contributor.style.marginRight = "20px";
                    const table_XGBoost = document.createElement('table');
                    table_XGBoost.style.border = "none";
                    table_XGBoost.style.marginTop = "8px";


                    const div_plot_model = document.createElement('div');
                    div_plot_model.setAttribute('id', `shapPlot_${hadm_id}_${model_name}`);
                    div_plot_model.style.display = "inline";


                    table_explainability(table_XGBoost, contributor[model_name].feature_name, contributor[model_name].feature_value);
                    top_contributor_title(title, div_table_contributor);   // add title to table top contributor
                    div_table_contributor.appendChild(table_XGBoost);
                    div_plot_model.appendChild(div_table_contributor);
                    return div_plot_model;
                }

                const contributor = json_data.model_detail[hadm_id][0].frontend_data;
                console.log(contributor.XGBoost.feature_name);

                const div_plot_model = table_contributor("Actual", hadm_id, "XGBoost");
                const div_plot_model_90 = table_contributor("90-Day", hadm_id, "XGBoost_90_days");
                const div_plot_model_180 = table_contributor("180-Day", hadm_id, "XGBoost_180_days");
                div_section_model.appendChild(div_plot_model);
                div_section_model.appendChild(div_plot_model_90);
                div_section_model.appendChild(div_plot_model_180);

                section_model_prediction.appendChild(div_section_model);
                patient_container.appendChild(section_model_prediction);

                // data for explainability
                //const explainability = json_data.model_detail[hadm_id][0].explainability;

                //renderShapSummaryPlot("Prediction", model_name[0], explainability.XGBoost.feature_names, explainability.XGBoost.shap_values, subject, hadm_id);
                //renderShapSummaryPlot("Prediction 90 days", model_name[1], explainability.XGBoost_90_days.feature_names, explainability.XGBoost_90_days.shap_values, subject, hadm_id);
                //renderShapSummaryPlot("Prediction 180 days", model_name[2], explainability.XGBoost_180_days.feature_names, explainability.XGBoost_180_days.shap_values, subject, hadm_id);

            }
        }

        , error: function (data) {

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
        type: "POST", url: window.location.href + "datamangement/feature_list/",
        data: {

            subject_id: $("input[name=new_patient_id]").val(),
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
                x: shapValues, y: featureNames, mode: 'markers', type: 'scatter', marker: {
                    size: 10, color: shapValues, colorscale: [[0, 'rgb(255, 8, 0)'], // start color
                        [1, 'rgb(0, 0, 255)'] // end color (blue)
                    ], reversescale: true, colorbar: {
                        title: 'high shap value'
                    }
                }
            };
            const layout = {

                height: 550, title: {
                    text: `SHAP Summary Plot`, font: {size: 12}
                }, xaxis: {
                    title: {text: 'SHAP Value (Impact on Model Output)', font: {size: 12}}, tickfont: {size: 10}
                }, yaxis: {
                    title: {text: 'Feature', font: {size: 12}}, tickfont: {size: 9}, type: 'category', automargin: true
                }, margin: {
                    l: 150, r: 50, t: 50, b: 50
                },


            };
            //
            Plotly.newPlot('shapPlot', [trace], layout, {responsive: true});

            const combined = featureNames.map((name, i) => ({
                feature: name, shap: shapValues[i]
            })); // Sort descending by SHAP value
            combined.sort((a, b) => b.shap - a.shap);
            console.log(combined);

        }, error: function (data) {

        }
    });
});

function renderShapSummaryPlot(title, model_name, featureNames, shapValues, subject, hadm_id) {

    const trace = {
        x: shapValues, y: featureNames, mode: 'markers', type: 'scatter', marker: {
            size: 7,
            color: shapValues,
            colorscale: [[0, 'rgb(255, 8, 0)'],   // red
                [1, 'rgb(0, 0, 255)']    // blue
            ],
            cmin: Math.min(...shapValues),
            cmax: Math.max(...shapValues),
            reversescale: true,
            colorbar: {
                title: {
                    text: 'Low ← SHAP Value → High', font: {size: 11}
                }
            },
            tickmode: 'array',
            tickvals: [Math.min(...shapValues), Math.max(...shapValues)],
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
        height: 550, width: 650, title: {
            text: `SHAP Summary Plot of model [${title}] Subject_id [${subject}], HADM_ID [${hadm_id}]`,
            font: {size: 12}
        }, xaxis: {
            title: {text: 'SHAP Value (Impact on Model Output)', font: {size: 12}}, tickfont: {size: 10}
        }, yaxis: {
            title: {text: 'Feature', font: {size: 12}}, tickfont: {size: 9}, type: 'category', automargin: true
        }, margin: {
            l: 150, r: 50, t: 50, b: 50
        }
    };

    Plotly.newPlot(`shapPlot_${hadm_id}_${model_name}`, [trace], layout, {responsive: true});
}

document.getElementById("tab-3").addEventListener("click", () => {
    //loadPatients();
});
document.addEventListener("DOMContentLoaded", function () {
    loadPatients();
});

async function loadPatients() {
    console.log("patient_list ... ");
    try {
        const response = await fetch("/datamanagement/patient_list/", {
            method: "GET", headers: {"X-Requested-With": "XMLHttpRequest"}
        });
        const patient_data = await response.json();
        console.log(patient_data);

        render_patient(patient_data);
    } catch (error) {
        console.error("Error loading patient data:", error);
    }
}

function add_detail_summary(data){
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
}
function parsePythonDict(str) {
    if (!str) return null;
    return JSON.parse(str.replace(/'/g, '"'));
}

function prediction_class(prediction){
    const tdPred = document.createElement("td");
    if (prediction >= 75) {
           tdPred.classList.add("high-risk");
        } else if (prediction >= 55) {
            tdPred.classList.add("medium-risk");
        } else {
            tdPred.classList.add("low-risk");
        }
    tdPred.textContent = `${prediction}%`;
    return tdPred;
}
function render_patient(data) {
    const patient_data = JSON.parse(data['patient_data']);
    patients = patient_data;
    // Insert into table
    const table = document.getElementById("table_patient");
    patient_data.forEach(p => {
        const pred = parsePythonDict(p.prediction);

        // fix Python dict
        const row = document.createElement("tr");
        // Icon cell
        const tdIcon = document.createElement("td");
        const img = document.createElement("img");
        img.src = `${data['image_url']}`;
        img.alt = "patient icon";
        img.width = 24;
        img.height = 24;
        tdIcon.appendChild(img);
        row.appendChild(tdIcon);

        // Subject_id
        const tdSubject = document.createElement("td");
        tdSubject.textContent = p.Subject_id; row.appendChild(tdSubject);

        // Hadm_id
        const tdHadm = document.createElement("td");
        tdHadm.textContent = p.Hadm_id;
        row.appendChild(tdHadm);

        // Age
        const tdAge = document.createElement("td");
        tdAge.textContent = p.Age;
        row.appendChild(tdAge);

        // Prediction
        const xgboost = pred?.XGBoost?.toFixed(2) ?? "N/A";
        const xgboost_90 = pred?.XGBoost_90_days?.toFixed(2) ?? "N/A"
        const xgboost_180 = pred?.XGBoost_180_days?.toFixed(2) ?? "N/A"



        row.appendChild(prediction_class(xgboost));
        row.appendChild(prediction_class(xgboost_90));
        row.appendChild(prediction_class(xgboost_180));

        // Add row to table
        table.appendChild(row);
    });
}
function parsePythonDict(str) {
     if (!str) return null;
     return JSON.parse( str
         .replace(/'/g, '"') // single → double quotes
         .replace(/\bNone\b/g, 'null') // Python None → JS null
         .replace(/\bTrue\b/g, 'true') // Python True → JS true
         .replace(/\bFalse\b/g, 'false') // Python False → JS false
    );

}

function buildFeatureTable(contributor, modelName, display_name) {

    const table = document.createElement("table");
    table.setAttribute('id', `contributor_${modelName}`);
    table.classList.add("feature-table");
    const header = document.createElement("tr");
    header.innerHTML = ` <th colspan="2">${display_name} </th> `;
    table.appendChild(header);
    const names = contributor[modelName].feature_name;
    const values = contributor[modelName].feature_value;
    names.forEach((name, index) => {
        if (index <= 4) {
            const row = document.createElement("tr");
            row.innerHTML = ` <td>${name}</td> <td>${cutTo2(values[index]) ?? "—"}</td> `;
            table.appendChild(row);
        }
        });
    document.getElementById('div_contributor').appendChild(table)

}


function create_dropdown(model_data, subject_id){
    const dropdown = document.getElementById('myDropdown');

    if (dropdown.hidden === true){
        dropdown.hidden = false;
    }
    dropdown.options.length = 0
    console.log("model_data", model_data);
    //const options = ["XGBoost", "XGBoost_90_days", "XGBoost_180_days"];
    const options = [];
    Object.entries(model_data).forEach(([key, value]) => {
        //console.log("Key:", key);
        //console.log("Value:", value[0]); // because each value is an array
        options.push(key);
    });

    options.forEach(opt => {
         const option = document.createElement("option");
         option.value = subject_id;
         option.textContent = `Hadm_id: ${opt}`;
         dropdown.appendChild(option);
     });
     return dropdown;
}

function no_data(){

    const div_contributor = document.getElementById('div_contributor');
    if (!document.getElementById('p_available')){

    const p_available = document.createElement('p');
    p_available.setAttribute('id', 'p_available');
    p_available.style.marginLeft = "20px";
    p_available.textContent = 'There are no features associated with this subject_id ';
    div_contributor.appendChild(p_available);
    }
}

document.getElementById("table_patient").addEventListener("click", (event) => {
    const row = event.target.closest("tr");
    const div_contributor = document.getElementById('div_contributor');

    if (!row || row.rowIndex === 0) return;
    // skip header
    const subject_id = row.children[1].textContent.trim();

    console.log("Clicked Subject_id:", subject_id);
    console.log("Coretta", patients);
    const patient = patients.find(p => String(p.Subject_id) === subject_id);
    const p_contributor_subject_id = document.getElementById('contributor_subject_id');
    p_contributor_subject_id.textContent = `Subject_id: ${subject_id}`;
    p_contributor_subject_id.style.marginLeft = "20px";
    remove_element();
    let contributor = null;
    const p_message_existing = document.getElementById('p_message');

    if (patient && patient.contributor_data) {

        // check if element already exist on the screen and remove it
        if (p_message_existing) {
            p_message_existing.remove();
        }
        const p_message = document.createElement('p');
        p_message.setAttribute('id', 'p_message');
        p_message.textContent = "Top 5 Clinical Features with the Highest Impact on the Prediction";
        p_message.style.marginLeft = "20px";
        div_contributor.appendChild(p_message);
        if (document.getElementById('p_available')){
            document.getElementById('p_available').remove();
        }
        contributor = parsePythonDict(patient.contributor_data);

        buildFeatureTable(contributor, "XGBoost", "Actual Prediction");
        buildFeatureTable(contributor, "XGBoost_90_days", "90-Days Prediction");
        buildFeatureTable(contributor, "XGBoost_180_days", "180-Days Prediction");


    } else {
        if (p_message_existing) {
            p_message_existing.remove();
        }
        no_data();
    }
});
function remove_element(){
        document.getElementById('contributor_XGBoost')?.remove();
        document.getElementById('contributor_XGBoost_90_days')?.remove();
        document.getElementById('contributor_XGBoost_180_days')?.remove();
}


function load_hadm_data(json_data) {
    //const data = JSON.parse(json_data);
    const patient_data = JSON.parse(json_data.data);
    console.log("patient_data ", patient_data[0]);
    console.log("patient_data.Hadm_id ", patient_data[0].Hadm_id);
    console.log("siewe", json_data);
    console.log('30.01 ', json_data.model_detail[patient_data[0].Hadm_id]);

    // Extract the inner key (e.g., "129")
    const tableContainer = document.getElementById('tableContainer');
    const patient_container = document.getElementById('patient_container');

    const patient_info = document.createElement('div');
    patient_info.setAttribute('id', 'patient_info_old');
    patient_info.classList.add('patient_info');
    patient_info.style.display = "flex";
    patient_info.style.flexDirection = "row";


    const section_details = document.createElement('div');
    section_details.classList.add('section_patient', 'column', 'row');
    section_details.style.backgroundColor = "white";
    section_details.style.marginBottom = "10px";
    section_details.style.width = "400px";
    section_details.style.border = "1px solid rgb(240, 242, 246)";
    section_details.style.borderRadius = "5px";
    section_details.style.paddingLeft = "5px";
    section_details.style.paddingRight = "5px";
    section_details.style.boxShadow = "(0, 0, 0, 0.15) 0px 0px 40px 0px";

    const header_patient = document.createElement('div');
    header_patient.setAttribute('id', 'header_patient');
    header_patient.style.backgroundColor = "white";

    const header_patient_data_h3 = document.createElement('h3');
    header_patient_data_h3.style.marginRight = "2%";
    header_patient_data_h3.textContent = "Patient Data";
    header_patient.appendChild(header_patient_data_h3);

    const h7 = document.createElement('h7');
    h7.style.marginRight = "2%";
    h7.textContent = "Personal Information";
    header_patient.appendChild(h7);

    const separator = document.createElement('div');
    separator.classList.add('seperator');
    header_patient.appendChild(separator);

    const tab_personal_info = document.createElement('table');
    tab_personal_info.setAttribute('id', 'personal_info');
    tab_personal_info.style.display = "flex";
    section_details.appendChild(tab_personal_info);

    const table_patient_info = document.createElement("table");
    table_patient_info.style.border = "none";
    table_patient_info.style.marginTop = "8px";
    table_patient_info.style.marginRight = "10px";
    table_patient_info.classList.add("table_inline");

    // Helper to add rows

    // this element is the container of all the 2 table

    addRow("Subject_id", patient_data[0].Subject_id, table_patient_info);
    addRow("Age", patient_data[0].Age, table_patient_info);
    addRow("Birthday", split_date(patient_data[0].Birthday), table_patient_info);
    addRow("Gender", patient_data[0].Gender, table_patient_info);
    addRow("Marital_status", patient_data[0].Marital, table_patient_info);
    addRow("Language", patient_data[0].Language, table_patient_info);
    addRow("Religion", patient_data[0].Religion, table_patient_info);


    tab_personal_info.appendChild(table_patient_info);
    section_details.appendChild(tab_personal_info);
    patient_info.appendChild(section_details);
    tableContainer.appendChild(patient_info);
    // section_diagnosis

    const table_patient_diagnosis = document.createElement('table');
    table_patient_diagnosis.classList.add('medical_info');
    table_patient_diagnosis.style.border = "none";
    table_patient_diagnosis.style.marginTop = "8px";
    table_patient_diagnosis.style.marginRight = "10px";

    const section_diagnosis = document.createElement('div');
    section_diagnosis.setAttribute('id', 'section_diagnosis');
    section_diagnosis.classList.add('section_patient', 'row');
    section_diagnosis.style.backgroundColor = "white";
    section_diagnosis.style.marginBottom = "10px";
    section_diagnosis.style.width = "600px";
    section_diagnosis.style.border = "1px solid rgb(240, 242, 246)";
    section_diagnosis.style.borderRadius = "5px";
    section_diagnosis.style.paddingLeft = "5px";
    section_diagnosis.style.paddingRight = "5px";
    section_diagnosis.style.marginLeft = "10px";
    section_diagnosis.style.marginRight = "5px";
    section_diagnosis.style.boxShadow = "rgba(0, 0, 0, 0.15) 0px 0px 40px 0px";

    const diagnosis_header = document.createElement('div');
    diagnosis_header.style.backgroundColor = "white";
    diagnosis_header.appendChild(header_patient_data_h3);
    diagnosis_header.appendChild(h7);
    diagnosis_header.appendChild(separator);
    section_diagnosis.appendChild(diagnosis_header);


    // insert element to table
    addRow("Hospital admission_id", patient_data[0].Hadm_id, table_patient_diagnosis);
    addRow("Admission_time", split_date(patient_data[0].Admission), table_patient_diagnosis);
    addRow("Insurance", patient_data[0].Insurance, table_patient_diagnosis);
    addRow("Diagnosis", (patient_data[0].Diagnosis || "").toLowerCase(), table_patient_diagnosis);
    addRow("Died", patient_data[0].Died, table_patient_diagnosis);



    // content about model for the prediction
    if (document.getElementById('p_error_available')) {
        document.getElementById('p_error_available').remove();
    }
    if (json_data.model_detail[patient_data[0].Hadm_id][0].len_hadm_id_result === 0) {

        const p_available = document.createElement('p');
        p_available.setAttribute('id', 'p_error_available');
        p_available.textContent = `There no Data available with the last Hospital admission ${patient_data[0].Hadm_id}`;
        diagnosis_data.appendChild(p_available);
        //tableContainer.appendChild(diagnosis_data);
    } else {
        console.log("false Coretta");
        const model_prediction = json_data.model_detail[patient_data[0].Hadm_id][0].prediction;
        addRow("Prediction", `${cutTo2(model_prediction.XGBoost)}%`, table_patient_diagnosis);
        addRow("Prediction after 90 days", `${cutTo2(model_prediction.XGBoost_90_days)}%`, table_patient_diagnosis);
        addRow("Prediction after 180 days", `${cutTo2(model_prediction.XGBoost_180_days)}%`, table_patient_diagnosis);

        diagnosis_data.appendChild(table_patient_diagnosis);
        //tableContainer.appendChild(diagnosis_data);
        const model_name = ['XGBoost', 'XGBoost_90_days', 'XGBoost_180_days'];

        // plot for the XGBoost
        const section_model_prediction = document.createElement('div');
        section_model_prediction.setAttribute('id', 'section_model_prediction');
        section_model_prediction.classList.add('section_model_prediction');

        const div_header_XGBoost = document.createElement('div');
        div_header_XGBoost.style.backgroundColor = "white";

        const header_XGBoost_h3 = document.createElement('h3');
        header_XGBoost_h3.textContent = "Prediction";
        div_header_XGBoost.appendChild(header_XGBoost_h3);

        const header_XGBoost_h7 = document.createElement('h7');
        header_XGBoost_h7.textContent = "Actual Prediction";
        header_XGBoost_h7.style.color = "grey";
        div_header_XGBoost.appendChild(header_XGBoost_h7);

        const separator_plot_XGBoost = document.createElement('div');
        separator_plot_XGBoost.classList.add('seperator');
        div_header_XGBoost.appendChild(separator_plot_XGBoost);

        section_model_prediction.appendChild(div_header_XGBoost);

        const div_section_model = document.createElement('div');
        div_section_model.style.display = "flex";
        div_section_model.style.flexDirection = "row";

        // top model contributor
        // create element table for contributor

        const contributor = json_data.model_detail[patient_data[0].Hadm_id][0].frontend_data;
        console.log(contributor.XGBoost.feature_name);


        function table_contributor(title, hadm_id, model_name) {
            const div_table_contributor = document.createElement('div');
            div_table_contributor.style.display = "flex";
            div_table_contributor.style.flexDirection = "column";
            div_table_contributor.style.marginRight = "20px";
            const table_XGBoost = document.createElement('table');
            table_XGBoost.style.border = "none";
            table_XGBoost.style.marginTop = "8px";


            const div_plot_model = document.createElement('div');
            div_plot_model.setAttribute('id', `shapPlot_${hadm_id}_${model_name}`);
            div_plot_model.style.display = "inline";


            table_explainability(table_XGBoost, contributor[model_name].feature_name, contributor[model_name].feature_value);
            top_contributor_title(title, div_table_contributor);   // add title to table top contributor
            div_table_contributor.appendChild(table_XGBoost);
            div_plot_model.appendChild(div_table_contributor);
            return div_plot_model;
        }
        const div_plot_model = table_contributor("Actual", patient_data[0].Hadm_id, "XGBoost");
        const div_plot_model_90 = table_contributor("90-Day", patient_data[0].Hadm_id, "XGBoost_90_days");
        const div_plot_model_180 = table_contributor("180-Day", patient_data[0].Hadm_id, "XGBoost_180_days");
        div_section_model.appendChild(div_plot_model);
        div_section_model.appendChild(div_plot_model_90);
        div_section_model.appendChild(div_plot_model_180);

        section_model_prediction.appendChild(div_section_model);

        tableContainer.appendChild(section_model_prediction);
        patient_container.appendChild(section_model_prediction);


    }
}
document.getElementById('myDropdown').addEventListener("change", function () {
    const selectedValue = this.value;
    const selectedText = this.options[this.selectedIndex].text;
    const subject_id = selectedValue;
    const hadm_id = selectedText;
    console.log("myDropdown", selectedValue);
    console.log("myDropdown text:", selectedText);


    $.ajaxSetup({
        headers: {
            'csrfmiddlewaretoken': $("input[name=csrfmiddlewaretoken]").val()
        }
    });
    $.ajax({
        type: "GET", url: window.location.href + "datamanagement/load_hadm_data/", data: {

            subject_id: subject_id,
            hadm_id: hadm_id,
            csrfmiddlewaretoken: $("input[name=csrfmiddlewaretoken]").val()
        }, dataType: "json",
        success: function (json_response) {
            console.log("datamanagement/load_hadm_data/ ", json_response);
            const patient_data  = JSON.parse(json_response.data);
            load_hadm_data(json_response);

        }
    });

});
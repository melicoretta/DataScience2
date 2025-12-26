# DataScience2
Project Description: Mortality Prediction Using the MIMIC Dataset

This data science project focuses on predicting patient mortality using the MIMIC (Medical Information Mart for Intensive Care) dataset. 
The primary objective is to develop an interpretable machine learning system that supports clinical decision-making by identifying key risk factors associated with patient outcomes.


The project begins with data preprocessing and feature extraction, where relevant clinical variables (e.g., demographics, vital signs, laboratory values, and comorbidities) are selected and engineered.
 Feature importance analysis is conducted at an early stage to understand which variables contribute most significantly to mortality prediction and to reduce model complexity.

Following feature selection, multiple machine learning models are trained and evaluated to predict mortality risk. The best-performing model is then saved as a pretrained model for deployment.

To make the model accessible and user-friendly, a Django-based web application is developed. This application serves as an interactive user interface where users can input patient data. 
The data is sent to the backend, where it is processed and passed to the pretrained model to generate mortality predictions in real time.

To ensure model transparency and explainability, the project integrates the SHAP (Shapley Additive Explanations) library.
 SHAP values are used to explain individual predictions by highlighting the contribution of each feature to the model’s output.
 This enhances trust and interpretability, which are critical in healthcare applications.


Overall, the project combines data science, machine learning, explainable AI, and web development to deliver an end-to-end solution for mortality prediction using real-world clinical data.

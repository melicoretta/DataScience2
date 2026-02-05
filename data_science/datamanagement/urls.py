from django.urls import path
from . import views

app_name = 'datamanagement'
urlpatterns = [

    path('', views.index_patient_data, name='patient_data'),
    path('datamangement/feature_list/', views.feature_list, name='feature_list'),
    path('datamanagement/search_row_id/', views.search_row_id, name='search_row_id'),
    path('datamanagement/search_subject_id/', views.search_subject_id, name='search_subject_id'),
    path('datamanagement/show_diagnosis/', views.show_diagnosis, name='show_diagnosis'),
    path('datamanagement/search_diagnosis/', views.search_diagnosis, name='search_diagnosis'),
    path('datamanagement/patient_list/', views.patient_list, name='patient_list'),
    path('datamanagement/search_new_patient/', views.search_new_patient, name='search_new_patient'),
    path('datamanagement/load_hadm_data/', views.load_hadm_data, name='load_hadm_data'),

]


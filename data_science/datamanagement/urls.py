from django.urls import path
from . import views


app_name = 'datamanagement'
urlpatterns = [

    path('', views.index, name='index'),
    path('datamangement/feature_list/', views.feature_list, name='feature_list'),
    path('datamanagement/search_row_id/', views.search_row_id, name='search_row_id'),
    path('datamanagement/upload_data', views.label_dataView.as_view(), name='upload_data'),
    path('datamanagement/search_subject_id/', views.search_subject_id, name='search_subject_id'),
    path('datamanagement/show_diagnosis/', views.show_diagnosis, name='show_diagnosis'),
    path('datamanagement/search_diagnosis/', views.search_diagnosis, name='search_diagnosis'),
    path('datamanagement/patient_list/', views.patient_list, name='patient_list'),
    path('datamanagement/search_new_patient/', views.search_new_patient, name='search_new_patient'),
    path('datamanagement/load_hadm_data/', views.load_hadm_data, name='load_hadm_data'),
    path('datamanagement/get_feature_view/', views.get_feature_view, name='get_feature_view'),

    path('datamanagement/feature_extraction/', views.feature_extraction, name="feature_extraction"),
]


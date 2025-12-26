from django.urls import path
from . import views

app_name = 'datamanagement'
urlpatterns = [

    path('', views.index, name='datamanagement'),
    path('datamanagement/search_row_id/', views.search_row_id, name='search_row_id'),
    path('datamanagement/search_subject_id/', views.search_subject_id, name='search_subject_id'),
    path('datamanagement/show_diagnosis/', views.show_diagnosis, name='show_diagnosis'),
    path('datamanagement/search_diagnosis/', views.search_diagnosis, name='search_diagnosis'),
    path('datamanagement/feature_list/', views.feature_list, name='feature_list'),

]


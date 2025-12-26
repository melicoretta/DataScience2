console.log("loading functions.js.");
var exampleDataArray = [
  ["123450", "Beschreibung 1", "EE0103/1/1/A" ],
  ["123451", "Beschreibung 2", "EE0101/1/1/B" ],
  ["123452", "Beschreibung 3", "EE0111/1/1/A" ],
  ["123453", "Beschreibung 4", "EE0101/1/1/A" ],
  ["123454", "Beschreibung 5", "EE0201/1/1/A" ],
  ["123455", "Beschreibung 6", "EE3101/4/1/A" ],
  ["123456", "Beschreibung 7", "EE0101/6/1/A" ],
  ["123457", "vielleicht auch ein teil", "EE0101/9/1/A" ],
  ["123459", "noch ein teil", "EE0101/1/1/C" ],
  ["123460", "ein teil ", "EE0101/1/1/B" ],
  ["123415", "anderes teil", "EE0141/4/1/A" ],
];
loadData=articleDataArray;
var userLoggedIn=false;
var autologinUserName="";
console.log("filtering local data. local data contains "+loadData.length+" entries.");
var dataArray=new Array(new Array("123456", "Testartikel", "EE0101/1/1/1/F"));
for(var i=0;i<loadData.length;i++){
  //console.log(".");
  if(loadData[i][0]=="" || loadData[i][1]=="" || loadData[i][2]==""){
  }
  else{
  dataArray.push(loadData[i]);
  }
}
console.log("local data filtered.");
function displayMessage(type,message){
  javascript:document.getElementById(type+"Popup").innerHTML=message;
  javascript:document.getElementById(type+"Popup").classList.remove("faded");
  setTimeout(function(){ javascript:document.getElementById(type+"Popup").classList.add("faded")}, 1500);
}
//displayMessage("error","Los geht's!");
//displayMessage("warning","Los geht's!");
//displayMessage("info","Los geht's!");
//dataArray=loadData;
var myPageIsDirty = false;
var myPageIsConsignment = false;
function testLogin(){
  if(document.getElementById("username").value!="" || autologinUserName!=""){
    if(autologinUserName!=""){
      document.getElementById("username").value=autologinUserName;
    }
    userLoggedIn=true;
    showInput(true);
    initLogoutTimer();
    document.getElementById("username").style.pointerEvents="none";
    document.getElementById("password").style.pointerEvents="none";
    document.getElementById("password").value="123456";
    //document.getElementById("inputTMPSCAN").focus();
    document.getElementById("searchArtNr").focus();
    console.log("user logged in.");
  }else {
    if(!userLoggedIn){
      displayMessage("warning", "Nutzername oder Passwort falsch.");
    }
    userLoggedIn=false;
    console.log("user logged out.");
    document.getElementById("username").style.pointerEvents="auto";
    document.getElementById("password").style.pointerEvents="auto";
    document.getElementById("password").value="";
    document.getElementById("outputLogoutTime").value="12:00";
    //document.getElementById("inputTMPSCAN").focus();
    document.getElementById("searchArtNr").focus();
    showInput(false);
  }
}
function logout(){
  if(!userLoggedIn){
    return;
  }
  if(myPageIsDirty){
    displayMessage("warning","Es sind noch nicht alle Daten abgechickt. Schicke automatisch ab.");
  }
  if(submitList()){
    document.getElementById("username").value="";
    testLogin();
	  location.reload();
  }else{
    displayMessage("error","Error on submit. logout aborted.");
  }
}
function loadConsignment(){
  var consignmentNumber=document.getElementById("inputConsignmentNumber").value;
  document.getElementById("inputConsignmentNumber").value="";
  if(consignmentNumber==""){
    return;
  }
  if(myPageIsDirty){
    console.log("Page is dirty. can't load consignment.")
    displayMessage("error","Kommissionierungen können nur bei leerer Liste geladen werden.");
    return;
  }
  if(socketSend("consignmentNumber:"+consignmentNumber)==1){
    return;
  }
  console.log("socket not ready. searching local consignment database");
  //document.getElementById("logarea").value="";
  var hits=0;
  myPageIsDirty=true;
  myPageIsConsignment=true;
  console.log("searchin through "+consignmentDataArray.length+" local entries.");
  for(var i=0;i<consignmentDataArray.length;i++){
    if(consignmentDataArray[i][0]==consignmentNumber){
      //document.getElementById("logarea").value+=consignmentDataArray[i]+"\r\n";
      hits++;
      var tmp = getPartFromPartNumber(consignmentDataArray[i][1]);
      //document.getElementById("logarea").value+="got: "+tmp+"\r\n";
      addLineWithData(tmp[0], tmp[1], tmp[2], consignmentDataArray[i][2], consignmentDataArray[i][2]);
    }
  }
  if(hits==0){
    console.log("found no consignment data.\r\n");
    myPageIsDirty=false;
    myPageIsConsignment=false;
    displayMessage("warning", "Keine Kommision mit Nummer "+consignmentNumber+" gefunden.")
  }else {
    displayMessage("info", "Kommissionierung mit Nummer "+consignmentNumber+" geladen.");
  }
}
function showInput(show){
  if(show){
    console.log("hiding input.");
    document.getElementById("fieldsVisibleWithLogin").style.visibility= "visible";
  }else{
    console.log("showing input.");
    document.getElementById("fieldsVisibleWithLogin").style.visibility= "hidden";
  }
}
function getPartFromPartNumber(partNumber){
  var data = dataArray;
  var hits = 0;
  for(var i=0;i<data.length;i++){
    if(data[i][0].toLowerCase().includes(partNumber.toLowerCase())){
      hits++;
      lasthit=i;
    }
  }
  if(hits==1){
    return data[lasthit];
  }else if(hits>1){
    return [partNumber, "more than one result", "..."];
  }else {
    return [partNumber, "not found", "not found"];
  }
}
function searchPart(e){
  //console.error('tst2');
  var data = dataArray;
  var tmpout=document.getElementById("texttotransmit");
  if(e.id=="searchArtNr"){
  var pattern=document.getElementById("searchArtNr").value;
  document.getElementById("searchDescription").value="";
  document.getElementById("searchStorageLocation").value="";
  targetfield=0;
  //var resultlist=document.getElementById("listArtNrn");
  var resultlistUL=document.getElementById("listArtNrnSelfmade");
  document.getElementById("listArtNrnSelfmade").style.visibility="visible";
  document.getElementById("listDescriptionsSelfmade").style.visibility="hidden";
  document.getElementById("listStorageLocationsSelfmade").style.visibility="hidden";
}else if(e.id=="searchDescription") {
  var pattern=document.getElementById("searchDescription").value;
  document.getElementById("searchArtNr").value="";
  document.getElementById("searchStorageLocation").value="";
  targetfield=1;
  //var resultlist=document.getElementById("listDescriptions");
  var resultlistUL=document.getElementById("listDescriptionsSelfmade");
  document.getElementById("listArtNrnSelfmade").style.visibility="hidden";
  document.getElementById("listDescriptionsSelfmade").style.visibility="visible";
  document.getElementById("listStorageLocationsSelfmade").style.visibility="hidden";
}else if(e.id=="searchStorageLocation") {
  var pattern=document.getElementById("searchStorageLocation").value;
  document.getElementById("searchArtNr").value="";
  document.getElementById("searchDescription").value="";
  targetfield=2;
  //var resultlist=document.getElementById("listStorageLocations");
  var resultlistUL=document.getElementById("listStorageLocationsSelfmade");
  document.getElementById("listArtNrnSelfmade").style.visibility="hidden";
  document.getElementById("listDescriptionsSelfmade").style.visibility="hidden";
  document.getElementById("listStorageLocationsSelfmade").style.visibility="visible";
}else {
  document.getElementById("listArtNrnSelfmade").style.visibility="hidden";
  document.getElementById("listDescriptionsSelfmade").style.visibility="hidden";
  document.getElementById("listStorageLocationsSelfmade").style.visibility="hidden";
  return;
}
resultlistUL.innerHTML="";
  if(pattern==""){
    document.getElementById("listArtNrnSelfmade").style.visibility="hidden";
    document.getElementById("listDescriptionsSelfmade").style.visibility="hidden";
    document.getElementById("listStorageLocationsSelfmade").style.visibility="hidden";
    return;
  }
  console.log('search:'+pattern);
  var hits=0;
  var lasthit=0;
  //tmpout.value ="";
  if(socketSend("field:"+targetfield+",data="+pattern)==1){
    return;
  }
  tmpout.value="";
  console.log("socket not ready. searching local database");
  for(var i=0;i<data.length;i++){
    //tmpout.value+= "i="+i+"/"+data.length+" data "+data[i][targetfield]+" pattern "+pattern+"\r\n";
    if(data[i][targetfield].toLowerCase().includes(pattern.toLowerCase())){
      hits++;
      lasthit=i;
      //var option = document.createElement('option');
      //option.value = data[i][targetfield];
      //resultlist.appendChild(option);
      //var li = document.createElement("li");
      //tmpout.value+= "i="+i+"/"+data.length+" data "+data[i][targetfield]+" pattern "+pattern+"\r\n";
      if(hits<20){
        switch (targetfield) {
          case 0:
            resultlistUL.innerHTML+="<li onclick=\'javascript:document.getElementById(\"searchArtNr\").value=this.innerHTML;document.getElementById(\"searchArtNr\").focus();searchPart(document.getElementById(\"searchArtNr\"))\'>"+data[i][targetfield]+"</li>";
            break;
          case 1:
            resultlistUL.innerHTML+="<li onclick=\'javascript:document.getElementById(\"searchDescription\").value=this.innerHTML;document.getElementById(\"searchDescription\").focus();\'>"+data[i][targetfield]+"</li>";
          break;
          case 2:
            resultlistUL.innerHTML+="<li onclick=\'javascript:document.getElementById(\"searchStorageLocation\").value=this.innerHTML;document.getElementById(\"searchStorageLocation\").focus();\'>"+data[i][targetfield]+"</li>";
          break;
          default:
          }
        }else if(hits==21){
        resultlistUL.innerHTML+="<li>...</li>";
      }
    }
  }
  document.getElementById("results").value = hits;
  if(hits==1){
  //tmpout.value+='hit';
  if(e.id=="searchArtNr"){
    document.getElementById("listArtNrnSelfmade").style.visibility="visible";
  }
  document.getElementById("inputArtNr").value = data[lasthit][0];
  document.getElementById("inputDescription").value = data[lasthit][1];
  document.getElementById("inputStorageLocation").value = data[lasthit][2];
  if(document.getElementById("searchArtNr").value.length>=6){
    document.getElementById("listArtNrnSelfmade").style.visibility="hidden";
    document.getElementById("inputAmmount").focus();
  }
  }
}


function addLine(){
var idnumber = document.getElementById("inputArtNr").value;
var description = document.getElementById("inputDescription").value;
var storagelocation = document.getElementById("inputStorageLocation").value;
var ammount = document.getElementById("inputAmmount").value;
myPageIsConsignment=false;
 addLineWithData(idnumber, description, storagelocation, ammount, ammount);
 displayMessage("info", "Teil "+idnumber+" zu Liste hinzugefügt.");
 document.getElementById("searchArtNr").value="";
 document.getElementById("searchDescription").value="";
 document.getElementById("searchStorageLocation").value="";
 document.getElementById("inputArtNr").value="";
 document.getElementById("inputDescription").value="";
 document.getElementById("inputStorageLocation").value="";
 document.getElementById("inputAmmount").value="";
 document.getElementById("results").value = "";
}


function addLineWithData(idnumber, description, storagelocation, targetAmmount, actualAmmount){
//console.log(targetAmmount+" "+actualAmmount);
if(addLine.id == undefined){
    addLine.id = 0;
  }
addLine.id++;
var id = addLine.id;
if(idnumber == "" || description == "" || storagelocation == ""){
  return;
}
 myPageIsDirty=true;
  var tablebody =  document.getElementById("datalistbody");
  var row = tablebody.insertRow(-1) ;
  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);
  var cell3 = row.insertCell(2);
  var cell4 = row.insertCell(3);
  var cell5 = row.insertCell(4);
  var cell6 = row.insertCell(5);
  var cell7 = row.insertCell(6);
  var cell8 = row.insertCell(7);
  var cell9 = row.insertCell(8);
  if(targetAmmount<1){
    targetAmmount=1;
  }
  if(actualAmmount<0 || actualAmmount == undefined || actualAmmount==""){
    actualAmmount=1;
  }
    cell1.innerHTML = id;
    cell2.innerHTML = idnumber;
    cell3.innerHTML = description;
    cell4.innerHTML = storagelocation;
    cell5.innerHTML = targetAmmount;
    cell6.innerHTML = actualAmmount;
    cell7.innerHTML = "<button onclick=javascript:increaseAmmount(this,10)>+10</button> <button onclick=javascript:increaseAmmount(this,1)>+1</button> <button onclick=javascript:decreaseAmmount(this,1)>-1</button> <button onclick=javascript:decreaseAmmount(this,10)>-10</button>";
    if(myPageIsConsignment){
      cell8.innerHTML = "<button onclick=javascript:markLine(this,"+id+")>&#x2713;</button>";
    }else{
      cell8.innerHTML = "<button onclick=javascript:removeLine(this,"+id+")>&#x274c;</button>";
    }
}
function markLine(e,id){
  //alert(e.parentElement.parentElement.cells[0].innerHTML);
  e.parentElement.parentElement.style.background="MediumSeaGreen";
  displayMessage("info","Eintrag als abgearbeitet markiert.");
}
function removeLine(e,id){
  //alert(e.parentElement.parentElement.cells[0].innerHTML);
  e.parentElement.parentElement.parentElement.removeChild(e.parentElement.parentElement);
  var tablebody =  document.getElementById("datalistbody");
  //alert(tablebody.rows.length);
  var rowcount = tablebody.rows.length;
  displayMessage("info","Eintrag entfernt.");
  if(rowcount==0){
    myPageIsDirty=false;
    myPageIsConsignment=false;
    displayMessage("info","Liste leer.");
  }
}
function increaseAmmount(e,inc){
  var ammount = e.parentElement.parentElement.cells[5].innerHTML;
  ammount=(ammount  - (-inc));
  if(ammount<0){
    ammount=0;
  }
  e.parentElement.parentElement.cells[5].innerHTML = ammount;
}
function decreaseAmmount(e,inc){
    //var tablebody =  document.getElementById("datalistbody");
    //tablebody.rows[id].cells[4].innerHTML = ammount-1;
    var ammount = e.parentElement.parentElement.cells[5].innerHTML;
    ammount=(ammount  - (inc));
    if(ammount<0){
      ammount=0;
    }
    e.parentElement.parentElement.cells[5].innerHTML = ammount;
}
function clearAll(){
  var tablebody =  document.getElementById("datalistbody");
  //alert(tablebody.rows.length);
  var rowcount = tablebody.rows.length;
  for(var i=0;i<rowcount;i++){
    tablebody.deleteRow(-1);
  }
  addLine.id = 0;
  myPageIsDirty=false;
  myPageIsConsignment=false;
  displayMessage("info","Liste geleert.");
}
function foundEmpty(){
  var output = document.getElementById("texttotransmit");
  var artNr = document.getElementById("inputArtNr").value;
  var storagelocation = document.getElementById("inputStorageLocation").value ;
  var username = document.getElementById("username").value;
    if(username!=""){
  output.value="Found Empty: ArtNr: \""+artNr+"\", Fach: \""+storagelocation+"\", User: \""+username+"\"\r\n";
sendRequest(output.value);
}else {
  alert("nicht eingelogt");
}
}
function submitList(){
  console.log("submit list.")
  var tablebody =  document.getElementById("datalistbody");
  var output = document.getElementById("texttotransmit");
  var username = document.getElementById("username").value;
  //alert(tablebody.rows.length);
  if(username!="" || userLoggedIn){
  var rowcount = tablebody.rows.length;
  if(rowcount==0){
    console.log("nothing to submit.")
    return true;
  }
  output.value="\"ArtNr\","+"\t"+"\"targetAmmount\","+"\t"+"\"actualAmmount\","+"\t\"from User: "+username+"\"\r\n";
  for(var i=0;i<rowcount;i++){
    output.value+="\""+tablebody.rows[0].cells[1].innerHTML+"\",\t\""+tablebody.rows[0].cells[4].innerHTML+"\",\t\""+tablebody.rows[0].cells[5].innerHTML+"\"\r\n";
  }
  var result=sendRequest(output.value);
  if(result){
    console.log("list submitted.");
    for(var i=0;i<rowcount;i++){
      tablebody.deleteRow(0);
    }
    addLine.id = 0;
    myPageIsDirty=false;
    myPageIsConsignment=false;
  }else {
    console.log("submit failed.");
    displayMessage("error","submit failed.");
  }
  return result;
}else {
  alert("nicht eingelogt");
}
  //document.getElementById("username").value="";
}
window.addEventListener('beforeunload', function(e) {
   //you implement this logic...
  if(myPageIsDirty) {
    //following two lines will cause the browser to ask the user if they
    //want to leave. The text of this dialog is controlled by the browser.
    e.preventDefault(); //per the standard
    e.returnValue = ''; //required for Chrome
  }
  //else: user is allowed to leave without a warning dialog
});
var artNrBuffer = "";
function parseScannedArtNr(charCode){
  setTimeout(function(){ artNrBuffer = "" }, 500);// lets wait for 0.5 seconds before resetting the buffer.
  if(charCode>=48 && charCode <=57){ // we have a number
    artNrBuffer+=charCode-48;
  }
 if(charCode==13 && artNrBuffer.length==6){//we might have a six digit artNr.
  console.log("Possible ArtNr ending with 13':"+artNrBuffer);
  document.getElementById("searchArtNr").value=artNrBuffer;
  artNrBuffer="";
  searchPart(document.getElementById("searchArtNr"));
  setTimeout(function(){
  document.getElementById("inputAmmount").focus();
  document.getElementById("inputAmmount").value="";
  }, 100);
 }
}
function ammountEntered(e){
  if (e.keyCode == 13) {
    console.log('ammountEntered.');
    //document.getElementById("inputTMPSCAN").focus();
    document.getElementById("searchArtNr").focus();
    addLine();
  }
}
console.log("registering key events.");
document.onkeypress =  zx;
function zx(e){
    var charCode = (typeof e.which == "number") ? e.which : e.keyCode
    //console.log(charCode);
    resetLogoutTimer();
    parseScannedArtNr(charCode);
}
PrimesWebSocket();
testLogin();
console.log('functions.js loaded.');


// for send entnahmmenge form-elemente
 $(document).ready(function () {
            $('#buttonAddLine').keypress(function (e) {
                if (e.keyCode == 13) {
                    e.preventDefault();
                    console.log("sending element from formular entnahmemenge")
                    document.getElementById('buttonAddLine').click();
                    //OR
                    document.getElementById('form_entnahmemenge').submit();
                }
            });
        });

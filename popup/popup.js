let params = new URLSearchParams(document.location.search);
let redirect = params.get("redirect") || "https://ilan.bloxxer.dev/";
document.getElementById("Continue").addEventListener("click", function () {
    location.href = redirect + "?accepted=true";
});
let SplicedRedirect = redirect.split("/")
console.log(SplicedRedirect)
document.getElementById("HBD").innerHTML=`${SplicedRedirect[2]}: Here Be Dragons!`;

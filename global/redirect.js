let RedirectUrlParameters = new URLSearchParams(location.search)
if (RedirectUrlParameters.get("accepted") !== "true") {
    location.href = `https://ilan.bloxxer.dev/popup/?redirect=${location.href}`
}
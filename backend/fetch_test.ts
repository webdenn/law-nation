
fetch("http://localhost:4000/uploads/images/1768803385598-882979049.jpg")
    .then(res => console.log("Status:", res.status, res.statusText))
    .catch(console.error);

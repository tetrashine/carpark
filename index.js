const path = require("path");
const express = require("express");
const app = express();

app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", function(req, res) {
    res.render("index", {
        "dev": !process.argv[2]
    });
});

app.use(express.static("static"));

app.listen(process.env.PORT || 5001);

const express = require("express");
const KifDB = require("./kifDB");

const app = express();
const kifDB = new KifDB("./db/kif.db");

const TEMP_USER_ID = 1;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  let kifs = await kifDB.getKifs(TEMP_USER_ID);
  console.log(kifs);
  res.render("index", { kifs: kifs });
});

app.get("/board/:kifid", async (req, res) => {
  console.log("kifid: " + req.params.kifid);
  res.render("board", { kifid: req.params.kifid });
});

app.get("/board", async (req, res) => {
  res.render("board");
});

app.route("/kif")
  .get(async (req, res) => {
    if (req.query.kifid === undefined) {
      let kifs = await kifDB.getKifs(TEMP_USER_ID);
      res.json(kifs);
    } else {
      let kif = await kifDB.getKif(req.query.kifid);
      res.json(kif);
    }
  })
  .post(async (req, res) => {
    const kifTitle = req.body.kifTitle;
    const kif = req.body.kif;

    try {
      await kifDB.addKif(TEMP_USER_ID, kifTitle, kif);
    } catch (err) {
      console.log(err);
      res.status(400);
      res.send("Failed to add kif");
      return;
    }

    res.status(200);
    res.end();
  })
  .put(async (req, res) => {
    console.log("TODO: update kif");
  })
  .delete(async (req, res) => {
    console.log("TODO: delete kif");
  });


app.listen(3000);

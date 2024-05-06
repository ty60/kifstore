const express = require("express");
const KifDB = require("./kifDB");

const app = express();
const kifDB = new KifDB("./db/kif.db");

const TEMP_USER_ID = 1;
const KIF_PER_PAGE = 16;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  let kifs = await kifDB.getKifs(TEMP_USER_ID);

  const page = req.query.page !== undefined ? parseInt(req.query.page) : 1;
  const start = (page - 1) * KIF_PER_PAGE;
  const end = start + KIF_PER_PAGE;

  const kifPage = kifs.slice(start, end);
  const hasNext = end < kifs.length;
  const hasPrev = page > 1;

  res.render("index", { kifs: kifPage, page, hasNext, hasPrev });
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
    const kifId = req.query.kifid;
    try {
      await kifDB.deleteKif(kifId);
    } catch (err) {
      console.log(err);
      res.status(400);
      res.send("Failed to delete kif");
      return;
    }

    res.status(200);
    res.end();
  });


app.listen(3000);

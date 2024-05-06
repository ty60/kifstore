const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();


class Kif {
  constructor(id, ownerId, title, kif) {
    this.id = id;
    this.ownerId = ownerId;
    this.title = title;
    this.kif = kif;
  }

  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      title: this.title,
      kif: this.kif,
    };
  }
}


class KifDB {
  constructor(dbPath) {
    if (fs.existsSync(dbPath)) {
      this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
    } else {
      this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
      this.createKifTable();
    }
  }

  // Create table
  createKifTable() {
    this.db.run("CREATE TABLE user(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
    this.db.run("CREATE TABLE kif(id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER, title TEXT UNIQUE, kif TEXT)");
  }

  addUser(name) {
    return new Promise((resolve, reject) => {
      this.db.run("INSERT INTO user (name) VALUES(?)", name, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  addKif(ownerId, kifTitle, kif) {
    return new Promise((resolve, reject) => {
      this.db.run("INSERT INTO kif(owner_id, title, kif) VALUES(?, ?, ?)", ownerId, kifTitle, kif, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getKif(kifId) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * from kif WHERE id = ?", kifId, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(new Kif(row.id, row.owner_id, row.title, row.kif));
        }
      });
    });
  }

  getKifs(ownerId) {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM kif WHERE owner_id = ?", ownerId, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const kifs = rows.map((row) => {
            return new Kif(row.id, row.owner_id, row.title, row.kif);
          });
          resolve(kifs);
        }
      })
    });
  }

  deleteKif(kifId) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM kif WHERE id = ?", kifId, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = KifDB;

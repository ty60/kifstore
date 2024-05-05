class Kifu {
  constructor() {
    this.startDate = new Date();
    this.endDate   = new Date();
    this.handicap  = "平手";
    this.firstPlayer = null;
    this.secondPlayer = null;

    this.moves = [];
  }

  static numToKanji(num) {
    return "一二三四五六七八九"[num - 1];
  }

  static kanjiToNum(kanji) {
    return "一二三四五六七八九".indexOf(kanji) + 1;
  }

  static moveToString(move) {
    let ret = "";
    ret += move.turn + " ";
    ret += move.toX + Kifu.numToKanji(move.toY) + move.piece;
    ret += move.promote ? "成" : "";
    ret += move.fromInHand ? "打" : "";
    ret += `(${move.fromX}${move.fromY})`;
    ret += "(0:00/0:00:00)";
    ret += "\n";
    return ret;
  }

  addMove(turn, owner, fromX, fromY, toX, toY, piece, promote, fromInHand, takePieceId, takePiecePromoted) {
    if (turn <= this.moves.length) {
      // The kifu is going to be overwritten
      this.moves.splice(turn - 1);
    }

    if (turn === 1) {
      if (owner === 0) {
        // PLAYER has the first move
        this.firstPlayer = "手前";
        this.secondPlayer = "奥";
      } else {
        // OPPONENT has the first move
        this.firstPlayer = "奥";
        this.secondPlayer = "手前";
      }
    }

    // TODO: Add time
    this.moves.push({
      turn: turn,
      owner: owner,
      fromX: fromX,
      fromY: fromY,
      toX: toX,
      toY: toY,
      piece: piece,
      promote: promote,
      fromInHand: fromInHand,
      takePieceId: takePieceId,
      takePiecePromoted: takePiecePromoted,
    });
  }

  /*
   * Add move with information that can be obtained by simply reading kif format.
   */
  addMoveFromKifu(turn, owner, fromX, fromY, toX, toY, piece, promote, fromInHand) {
    this.moves.push({
      turn: turn,
      owner: owner,
      fromX: fromX,
      fromY: fromY,
      toX: toX,
      toY: toY,
      piece: piece,
      promote: promote,
      fromInHand: fromInHand,
    });
  }

  popMove() {
    return this.moves.pop();
  }

  dump() {
    let ret = "";
    ret += "# ---- Kifu ----\n";
    // TODO: Deal with date properly
    ret += "開始日時: " + this.startDate + "\n";
    ret += "終了日時: " + this.endDate + "\n";
    ret += "手合割: " + this.handicap + "\n";
    ret += "先手: " + this.firstPlayer + "\n";
    ret += "後手: " + this.secondPlayer + "\n";
    ret += "\n";
    ret += "手数----指手----消費時間\n";

    for (let move of this.moves) {
      ret += Kifu.moveToString(move);
    }

    let numTurns = this.moves.length;
    ret += `${numTurns + 1} 中断 (0:00/0:00:00)\n`;
    return ret;
  }

  getMove(turn) {
    return this.moves[turn - 1];
  }

  parse(kif) {
    let lines = kif.split("\n");
    let beginMoves = -1;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.startsWith("開始日時: ")) {
        this.startDate = new Date(line.substring(6));
      } else if (line.startsWith("終了日時: ")) {
        this.endDate = new Date(line.substring(6));
      } else if (line.startsWith("手合割: ")) {
        this.handicap = line.substring(5);
      } else if (line.startsWith("先手: ")) {
        this.firstPlayer = line.substring(4);
      } else if (line.startsWith("後手: ")) {
        this.secondPlayer = line.substring(4);
      } else if (line.startsWith("手数----指手----消費時間")) {
        beginMoves = i + 1;
        break;
      }
    }

    if (beginMoves === -1) {
      throw new Error("Invalid Kifu format");
    }

    let currOwner = this.firstPlayer === "手前" ? 0 : 1;

    for (let i = beginMoves; i < lines.length; i++) {
      const line = lines[i];
      const turn = i - beginMoves + 1;

      if (line.includes("中断")) {
        break;
      }

      const re = /(\d+) ([^\(]+)\((\d+)\)/g;
      const res = re.exec(line);

      const toX = parseInt(res[2][0]);
      const toY = Kifu.kanjiToNum(res[2][1]);
      const fromX = parseInt(res[3][0]);
      const fromY = parseInt(res[3][1]);
      const piece = res[2][2];
      const promote = res[2].includes("成");
      const fromInHand = res[2].includes("打");

      this.addMoveFromKifu(turn, currOwner, fromX, fromY, toX, toY, piece, promote, fromInHand);

      currOwner = currOwner === 0 ? 1 : 0;
    }
  }
}


export default Kifu;

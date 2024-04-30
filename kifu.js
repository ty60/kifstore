class Kifu {
  constructor() {
    this.startDate = new Date();
    this.endDate   = new Date();
    this.handicap  = "平手";
    this.firstPlayer = "先手";
    this.secondPlayer = "後手";

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
}


export default Kifu;

const fs = require("fs");
const path = require("path");

const validTokens = ["うんち！", "うんち？", "うんち。"];
const definedInstructions = {
  INCREMENT_POINTER: "。？",
  DECREMENT_POINTER: "？。",
  INCREMENT_VALUE: "。。",
  DECREMENT_VALUE: "！！",
  IN: "。！",
  OUT: "！。",
  LOOP_START: "！？",
  LOOP_END: "？！",
};

// 実行時引数にファイルを指定しなかったらエラー
if (process.argv.length < 3) {
  throw new Error("You must give filename as an argument.");
}

const filename = process.argv[2];

// ファイル名が.poopじゃなかったらエラー
if (path.extname(filename) === "poop") {
  throw new Error("File extention must be 'poop'. e.g. file.poop");
}

// ファイルの文字列を"うんち！"などのトークンに分割して実行に必要な部分を配列にいれる。
// 例: "うんち！ /* コメント */ うんち。" => ["！", "。"]
function tokenize(input) {
  let current = 0;
  const tokens = [];

  while (current < input.length) {
    // 空白文字(スペースや改行)は無視
    if (/\s/.test(input[current])) {
      current++;
      continue;
    }

    // コメントは無視する
    // '/*' がでてきたら次の '*/' まで無視
    if (input.substr(current, 2) === "/*") {
      current++;
      while (input.substr(++current, 2) !== "*/") {
        if (current + 2 >= input.length) {
          throw new Error("Unclosed comment detected.");
        }
      }
      current += 2;
      continue;
    }

    // 「うんち！」とかを1トークンとしてみる
    const token = input.substr(current, 4);

    if (validTokens.includes(token)) {
      // 「うんち」はどうせ一緒なので4文字目(！ or ？ or 。)だけを配列に格納してメモリを節約する
      tokens.push(token[3]);
      current += 4;
      continue;
    }

    // 定義にない文字列に出くわしたらエラー
    token.split("").forEach((c, i) => {
      if (![["う"], ["ん"], ["ち"], ["！", "？", "。"]][i].includes(c)) {
        const errorAt = current + i + 1;

        throw new Error(`Invalid token ${c} at ${errorAt}th (st,nd,rd) char.`);
      }
    });
  }
  return tokens;
}

// トークンの配列を受け取って命令オブジェクトの配列(AST)に変換する
function parse(tokens) {
  //トークンが奇数個しかない時はエラー
  if (tokens.length % 2 !== 0) {
    throw new Error(
      "Invalid number of tokens. An instruction always consists of 2 tokens, but odd number of tokens found."
    );
  }

  let current = 0;

  // ループがネストするかもしれないので今いるループ階層を保持
  let loopDepth = 0;

  // ネストされたループに対応するために再帰的に解析していく。
  return (function parseRecursively() {
    const instructions = [];

    while (current < tokens.length) {
      const instruction = tokens[current] + tokens[++current];

      if (instruction === "？？") {
        throw new Error("Invalid instruction 'うんち？ + うんち？");
      }

      // 入力は今回実装してないので入力命令が出されたらエラーを吐く
      if (instruction === definedInstructions.IN) {
        throw new Error("Reading from stdin is not currently supported.");
      }

      if (instruction === definedInstructions.LOOP_END) {
        // ループ内でLOOP_ENDが出てきたらそのループは終了
        if (loopDepth > 0) {
          loopDepth--;
          break;
        }

        // ループ外で単独のLOOP_ENDが出てきたらエラー
        throw new Error("Invalid end of loop. Check the syntax.");
      }

      if (instruction === definedInstructions.LOOP_START) {
        // LOOP_STARTが出てきたら再起的に解析してループ命令として格納
        loopDepth++;
        current++;
        instructions.push({ type: "loop", value: parseRecursively() });
      } else {
        // ループじゃなければそのまま命令を格納
        instructions.push({ type: "instruction", value: instruction });
      }

      current++;
    }

    return instructions;
  })();
}

// poopfuckの実行エンジン
class PoopFucker {
  pointer = 0;
  memory = [0, null];

  do(instructions) {
    instructions.forEach((instruction) => {
      if (instruction.type === "loop") {
        while (this.memory[this.pointer] !== 0) {
          this.do(instruction.value);
        }
      } else if (instruction.type === "instruction") {
        switch (instruction.value) {
          case definedInstructions.INCREMENT_POINTER:
            this.pointer++;
            if (this.memory[this.pointer] === null) {
              this.memory[this.pointer] = 0;
              this.memory.push(null);
            }
            break;
          case definedInstructions.DECREMENT_POINTER:
            this.pointer--;
            break;
          case definedInstructions.INCREMENT_VALUE:
            this.memory[this.pointer]++;
            break;
          case definedInstructions.DECREMENT_VALUE:
            this.memory[this.pointer]--;
            break;
          case definedInstructions.IN:
            console.warn(
              "Reading from stdin is not implemented. Skipping instruction."
            );
            break;
          case definedInstructions.OUT:
            process.stdout.write(
              String.fromCharCode(this.memory[this.pointer])
            );
            break;
          default:
            throw new Error(`Undefined instruction ${instruction.value}`);
        }
      } else {
        throw new Error(`Invalid instruction type ${instruction.type}`);
      }
    });
  }
}

// コード文字列を受け取って実行する関数
function runCode(code) {
  const tokens = tokenize(code);
  const instructions = parse(tokens);
  const runTime = new PoopFucker();
  runTime.do(instructions);
}

// poopファイルを実行
try {
  const code = fs.readFileSync(filename, "utf-8");
  runCode(code);
} catch (err) {
  throw new Error(`Could not find file ${filename}.`);
}

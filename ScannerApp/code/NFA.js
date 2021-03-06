class NFA {
    constructor(str) {
        // 对正则表达式的书写要求
        // 单个字母用字母l表示，单个数字用字母n表示
        // 运算符（+ - / = > < % ! &）用自身表示，乘运算的*用字母k表示，或运算的|用字母o表示
        // ////////////////////////，>=用z、<=用x、==用c、!=用v、++用a、--用m
        // 分隔符（, ; { }）用自身表示，左括号(用字母q表示，右括号)用字母p表示
        this.states = new ArrayList();
        // 初始化NFA
        // 最原始的NFA：0 --re--> (1) （括号表示圈，指状态机终止状态）
        let tmp0 = new StateNode(0, false, true);
        let tmp1 = new StateNode(1, true, false);
        tmp0.addEdgeFromEdge(new Edge(this.simplifyRE(str), tmp1));
        // this.states = new ArrayList([tmp0, tmp1]);
        this.states.addFromIndex(0, tmp0);
        this.states.addFromIndex(1, tmp1);
        // 铺开NFA
        this.InitNFA();
        // console.log(this.showNFA());
    }

// 将原始的只具有0、1两个状态的NFA铺开
    InitNFA() {
        // 遍历检查NFA内每一个StateNode
        // 当前StateNode中，检查它具有的Edge中是否有可拆分的内容
        // 这个node的size随着拆分进行，可能会发生变化
        for (let i = 0; i < this.states.size(); i++) {
            let tmpNode = this.states.get(i);
            // 这个edge的size随着拆分进行，可能会发生变化
            for (let j = 0; j < tmpNode.edges.size(); j++) {
                // 若当前边的re是(~~~)*形式或l*形式
                if ((tmpNode.edges.get(j).re.charAt(0) === '('
                    && tmpNode.edges.get(j).re.length - 2 === this.findRightBracket(tmpNode.edges.get(j).re)
                    && tmpNode.edges.get(j).re.charAt(tmpNode.edges.get(j).re.length - 1) === '*')
                    || (tmpNode.edges.get(j).re.length === 2 && tmpNode.edges.get(j).re.charAt(1) === '*')) {
                    let newRE = tmpNode.edges.get(j).re.substring(0, tmpNode.edges.get(j).re.length - 1);
                    let removeEdge = tmpNode.edges.remove(j);
                    // 需新增一个StateNode
                    let newNode = new StateNode(this.states.size(), false, false);
                    // e表示空
                    newNode.addEdgeFromEdge(new Edge("e", removeEdge.to));
                    // 这里的newNode可能有一个自己指向的自己并不是自己的问题，因为Edge构造函数中，这里是一个拷贝
                    newNode.addEdgeFromEdge(new Edge(this.simplifyRE(newRE), newNode));
                    this.states.addFromElement(newNode);
                    if (tmpNode.addEdgeFromIndex(j, new Edge("e", newNode))) {
                        // 因为edges[j]操作过，所以需要重新检查j处
                        j--;
                    }
                } else {
//                System.out.println(Arrays.toString(CutRE(tmpNode.edges.get(j).re)));
                    let cutArray = this.CutRE(tmpNode.edges.get(j).re);
                    // 若当前边的re是~~~|~~~形式
                    if (cutArray[1] === "|") {
                        let isChanged = false;
                        let tmp = j;
                        // console.log("before remove: tmpNode.edges.size() " + tmpNode.edges.size());
                        let removeEdge = tmpNode.edges.remove(j);
                        // console.log("after remove: tmpNode.edges.size() " + tmpNode.edges.size());
                        if (tmpNode.addEdgeFromIndex(j, new Edge(this.simplifyRE(cutArray[0]), removeEdge.to))) {
                            tmpNode.addEdgeFromIndex(j + 1, new Edge(this.simplifyRE(cutArray[2]), removeEdge.to));
                            isChanged = true;
                        } else {
                            if (tmpNode.addEdgeFromIndex(j, new Edge(this.simplifyRE(cutArray[2]), removeEdge.to)))
                                isChanged = true;
                        }
                        // 因为edges[j]操作过，所以需要重新检查j处
                        if (isChanged)
                            j--;
                    } else if (cutArray[2] === "") {
                        // 若当前边的re已不再可分
                    } else {
                        let removeEdge = tmpNode.edges.remove(j);
                        // 需新增一个StateNode
                        let newNode = new StateNode(this.states.size(), false, false);
                        newNode.addEdgeFromEdge(new Edge(this.simplifyRE(cutArray[2]), removeEdge.to));
                        this.states.addFromElement(newNode);
                        if (tmpNode.addEdgeFromIndex(j, new Edge(this.simplifyRE(cutArray[0]), newNode))) {
                            // 因为edges[j]操作过，所以需要重新检查j处
                            j--;
                        }
                    }
                }
            }
            // 当前状态的所有边处理完后，将NFA中的node删除，把tmpNode放到原处
            this.states.remove(i);
            this.states.addFromIndex(i, tmpNode);
        }
    }

// 切割RE，需判断切割处是与（空）还是或（|）
    CutRE(re) {
        let cutpoint = this.findCutPoint(re);
        if (cutpoint + 1 < re.length - 1 && re.charAt(cutpoint + 1) === '|')
            return [re.substring(0, cutpoint + 1), "|", re.substring(cutpoint + 2)];
        else
            return [re.substring(0, cutpoint + 1), "", re.substring(cutpoint + 1)];
    }

// 处理re，从头开始寻找可能的切分点
// 返回切分后前一部分的尾下标
// 若不可切分返回-1
// re均为后缀*
    findCutPoint(re) {
        // re以(开头
        let out;
        if (re.charAt(0) === '(') {
            // 检查对应右括号后是否有*
            out = this.findRightBracket(re);
            if (out + 1 <= re.length - 1 && re.charAt(out + 1) === '*')
                out++;
        } else {
            // 检查开头字符后是否有*
            out = 0;
            if (out + 1 <= re.length - 1 && re.charAt(out + 1) === '*')
                out++;
        }
//        System.out.println(out);
        return out;
    }

// 剥除RE最外可能存在的无意义()
    simplifyRE(re) {
        let out = re;
        // console.log("out !== \"\" ", (out !== ""));
        // console.log("out.charAt(0) === \"(\" ", (out.charAt(0) === "("));
        // console.log("out.length - 1", out.length - 1);
        // console.log("this.findRightBracket(out) ", this.findRightBracket(out));
        // console.log("out.length - 1 === this.findRightBracket(out) ", (out.length - 1 === this.findRightBracket(out)));
        if (out !== "" && out.charAt(0) === "(" && out.length - 1 === this.findRightBracket(out)) {
            out = out.substring(1, out.length - 1);
            out = this.simplifyRE(out);
        }
//        System.out.println(out);
        return out;
    }

// NFA显示
    showNFA() {
        let out = "NFA:\n";
        for (let i = 0; i < this.states.size(); i++) {
            out += this.states.get(i).showEdges();
        }
        return out;
    }

// re为'('开头的字符串，找这个'('对应的')'
    findRightBracket(re) {
        // 这对括号内所包含的括号对数（含自身）
        let pair = 1;
        let leftBracs = new ArrayList();
        leftBracs.addFromElement(0);
        // 第一个右括号
        let possible_rightBrac = re.indexOf(')');
        // 若存在已发现右方的未发现的左括号，且其在第pair个右括号左边
        while (re.indexOf('(', leftBracs.get(pair - 1) + 1) !== -1 && re.indexOf('(', leftBracs.get(pair - 1) + 1) < possible_rightBrac) {
            // 记录该左括号位置
            leftBracs.addFromElement(re.indexOf('(', leftBracs.get(pair - 1) + 1));
            // console.log("left: " + re.indexOf('(', leftBracs[pair - 1] + 1));
            // 对数+1
            pair++;
//            System.out.println("leftBracs: " + leftBracs);
            // 找下一个右括号
            possible_rightBrac = re.indexOf(')', possible_rightBrac + 1);
        }
        return possible_rightBrac;
    }
}
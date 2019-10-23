import {
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	CompletionItemKind,
	Range,
} from 'vscode-languageserver';

import { loglog , logloglog } from './utils';


export let antlrP4HeaderDec: Map<string, any[]> = new Map();
export let antlrP4StructHeaders: Map<string, string> = new Map();

import { CommonTokenStream, InputStream} from 'antlr4';
import { ErrorListener } from 'antlr4/error';

import { P4Lexer } from './antlr_autogenerated/P4Lexer';
import { P4Parser } from './antlr_autogenerated/P4Parser';
import { P4Listener } from './antlr_autogenerated/P4Listener';
import { ParseTreeWalker } from 'antlr4/tree';

import { connection } from './server';


let MyP4Listner = function() : void {
	P4Listener.call(this); // inherit default listener
	return this;
};
// continue inheriting default listener
MyP4Listner.prototype = Object.create(P4Listener.prototype);
MyP4Listner.prototype.constructor = MyP4Listner;


////symbol table -> installed package from https://www.npmjs.com/package/symbol-table (npm install symbol-table)
var SymbolTable = require("symbol-table");

//pointers array (no pointers in Javascript but this will act like it)
var symPtrs = [];

//pushing global scope to the top of the pointer array
symPtrs.push(SymbolTable());

var top;

var pScope;	//pushedScope

var sScope;	//savedScope
var sScopeArr = []; //savedScopeArray

/*
	IMPORTANT NOTE: 

	.push() with no arguments means pushing a new scope on to the symbol table. This is part of the installed package symbol-table
	.push(arg1, arg2, ...) is a built in array function with Javascript. This is used to push onto the symPtrs array.

	(to avoid confusion)

*/

/** 
*@param {Array} stack -- stack
*@param {Array} saver -- saver
*/

function peekAndPush(stack, noder){

	var peeker = stack[stack.length-1];	//setting peeker to the top of the stack
	var pusher = peeker.push();	//creating a new scope on top of peeker
	pusher.set(noder.identifier, noder); //setting the name as the identifier, and the info as node in the tree
	stack.push(pusher);	//pushing the finished product at the top of the array

	return stack;

}

function peekAndPop(stack, saver){
	var peeker = stack[stack.length-1];
	var popper = peeker.pop();
	saver.add(popper);	//I am just saving this in a another array, but I need to figure out how to organize it

	return stack;
}
//for every identifier i should define the type. Store the context and the type

MyP4Listner.prototype.enterConstantDeclaration = function(ctx) {
	pScope.set(ctx.identifier, ctx);	//setting the name as the identifier, and the information as the node in the tree
};

MyP4Listner.prototype.exitConstantDeclaration = function(ctx){
	//do nothing, all constants need to do is be added
};

MyP4Listner.prototype.enterControlDeclaration = function(ctx){
	peekAndPush(symPtrs, ctx);
};

MyP4Listner.prototype.exitControlDeclaration = function(ctx){
	peekAndPop(symPtrs, sScopeArr);

};

MyP4Listner.prototype.enterTableDeclaration = function(ctx){

	peekAndPush(symPtrs, ctx);

	//saving this for testing purposes
	/* 
	top = symPtrs[symPtrs.length-1];	//setting "top" to the top of the stack
	pScope = top.push();	//creating a new scope on top of the current top
	pScope.set(ctx.identifier, ctx);	//setting the name as the identifier, and the information as the node in the tree
	symPtrs.push(pScope);	//pushing the new scope onto the symPtrs array
	*/
};

MyP4Listner.prototype.exitTableDeclaration = function(ctx){

	peekAndPop(symPtrs, sScopeArr);
	// saving this for testing purposes
	/*
	top = symPtrs[symPtrs.length-1];	//setting "top" to the top of the stack
	sScope = top.pop();	//pop the top of the stack
	sScopeArr.push(sScope);	//save pushed scope in case we need it
	*/
};


MyP4Listner.prototype.enterAssignmentOrMethodCallStatement = function(ctx) {
	// loglog("Assign: " + ctx.getText());
};


export function sendToAntlrCompiler(textDocument: TextDocument){
	loglog("Running Antlr Compiler");
	let myP4Listner = new MyP4Listner();
	let errorListener: MyErrorListner = new MyErrorListner(textDocument);
	let tree = setupLexerAndParser(textDocument, errorListener);
	try{
		ParseTreeWalker.DEFAULT.walk(myP4Listner, tree);
	} catch(e){}

	if(!errorListener.isEmpty()){
		let diagnostics: Diagnostic[] = errorListener.getDiagnostics();
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}
}

function setupLexerAndParser(textDocument: TextDocument, errorListener: MyErrorListner) {
	let input: string = textDocument.getText();
	let chars = new InputStream(input);
	let lexer = new P4Lexer(chars);
	lexer.strictMode = false; // do not use js strictMode
	let tokens = new CommonTokenStream(lexer);
	let parser = new P4Parser(tokens);

	parser.removeErrorListeners(); // Remove default ConsoleErrorListener
	parser.addErrorListener(errorListener); // Add custom error listener

	parser.buildParseTrees = true;
	let tree = parser.input();
	return tree;
}

class MyErrorListner extends ErrorListener {
	textDocument: TextDocument;
	diagnostics: Diagnostic[] = [];

	constructor(text: TextDocument){
		super();
		this.textDocument = text;
	}

	isEmpty(): boolean {
		return this.diagnostics.length == 0;
	}

	getDiagnostics(): Diagnostic[]{
		return this.diagnostics;
	}

	syntaxError(recognizer, symbol, line, column, message, payload) {
		let diagnosic : Diagnostic = this.convertToDiagnostic(symbol, message);
		this.diagnostics.push(diagnosic);
	}

	convertToDiagnostic(symbol, message): Diagnostic{
		let diagnosic: Diagnostic = {
			severity: DiagnosticSeverity.Error,
			range: {
				start: this.textDocument.positionAt(symbol.start),
				end: this.textDocument.positionAt(symbol.stop),
			},
			message: message,
			source: 'P4 Extension'
		};
		return diagnosic;
	}
}


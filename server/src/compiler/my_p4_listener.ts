import { P4Listener } from '../antlr_autogenerated/P4Listener';
import { logDebug, logInfo} from '../utils/logger';
import { P4IRTypes } from './p4_ir_types';
import { SymbolTable } from './symbol_table';
import { Attribute, P4IR } from './p4_ir';
import { TextDocumentPositionParams, CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { getName } from '../antlr_compiler_proxy';

export class MyP4Listener extends P4Listener{
	private sTable: SymbolTable;

	constructor(){
		super();
		P4Listener.call(this);
		this.sTable = new SymbolTable();
	}

	getAutoCompletions(keyword: string | null, pos: TextDocumentPositionParams): CompletionItem[] {
		// TODO: hot keyword to be shown in the top of the list
		return this.sTable.getAutoCompletion(keyword, pos);
	}

	pushBlock(type: P4IRTypes, ctx): P4IR{
		let attr: Attribute | null = null;
		let name: string | null;

		if(typeof ctx.name === "function" && ctx.name() != null)
			name = ctx.name().getText();
		else
			name = getName(ctx);

		if(name != null)
			attr = new Attribute(name , name, CompletionItemKind.Class);
		return this.sTable.push(ctx, type, attr);
	}

	enterProgram(ctx){
		this.sTable.push(ctx, P4IRTypes.P4_PROGRAM, null);
	}

	exitProgram(ctx){
		this.sTable.pop();
	}

	enterTableDeclaration(ctx){
		let p:P4IR = this.pushBlock(P4IRTypes.TABLE, ctx);
		let helperField: Attribute = new Attribute("apply()", "method", CompletionItemKind.Function);
		p.add(helperField);
	}

	exitTableDeclaration(ctx){
		this.sTable.pop();
	}

	enterControlDeclaration(ctx){
		let p:P4IR = this.pushBlock(P4IRTypes.CONTROLLER, ctx);
		let helperField: Attribute = new Attribute("apply()", "method", CompletionItemKind.Function);
		p.add(helperField);
	}

	exitControlDeclaration(ctx){
		this.sTable.pop();
	}

	enterActionDeclaration(ctx){
		this.pushBlock(P4IRTypes.ACTION, ctx);
	}

	exitActionDeclaration(ctx){
		this.sTable.pop();
	}

	enterHeaderTypeDeclaration(ctx){
		let name: string = getName(ctx);
		this.pushBlock(P4IRTypes.HEADER, ctx);
	}

	exitHeaderTypeDeclaration(ctx){
		this.sTable.pop();
	}

	enterStructTypeDeclaration(ctx){
		this.pushBlock(P4IRTypes.STRUCT, ctx);
	}

	exitStructTypeDeclaration(ctx){
		this.sTable.pop();
	}

	enterConstantDeclaration(ctx) {
		let name: string | null  = getName(ctx);
		let type: string = ctx.typeRef().getText();
		let attr: Attribute = new Attribute(name, type, CompletionItemKind.Constant);
		this.sTable.add_attr(attr);
	}

	enterVariableDeclaration(ctx){
		let name: string | null  = getName(ctx);
		let type: string = ctx.typeRef().getText();
		let attr: Attribute = new Attribute(name, type, CompletionItemKind.Variable);
		this.sTable.add_attr(attr);
	}

	enterParameter(ctx) {
		let name: string = ctx.name().getText();
		let type: string = ctx.typeRef().getText();
		let attr: Attribute = new Attribute(name, type, CompletionItemKind.Variable);
		this.sTable.add_attr(attr);
	}

	enterStructField(ctx){
		let name: string = ctx.name().getText();
		let type: string = ctx.typeRef().getText();
		let attr: Attribute = new Attribute(name, type, CompletionItemKind.Field);
		this.sTable.add_attr(attr);
	}
}
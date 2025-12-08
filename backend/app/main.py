from fastapi import FastAPI

app = FastAPI(title="PaceCtrl API")

todoList=[]

@app.get("/todoList")
def get_todoList():
    return {"todoList": todoList}

@app.post("/todoList")
def add_to_todoList(item: str):
    todoList.append(item)
    return {"message": "Item added", "todoList": todoList}
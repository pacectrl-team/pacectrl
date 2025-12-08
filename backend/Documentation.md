* in backend folder, create a new virtual environment
  * python -m venv .venv

* select / activate virutal environment:
  * .venv\Scripts\activate

* Install all the dependencies in [requirements.txt](requirements.txt) file
  * pip install -r requirements.txt

* Test backend by running:
  * uvicorn app.main:app --reload
* API documentation available at: 
  * http://127.0.0.1:8000/docs


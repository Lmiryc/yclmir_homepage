# homepage_endpoints
The api implementation by python flask for personal page.

## Minimal comment endpoint (Flask)

This project now includes a deploy-ready Flask API that stores comments in SQLite.

### Endpoint

- `POST /api/v1/admin/login/`
- `POST /api/v1/admin/logout/`
- `GET /api/v1/admin/session/`
- `POST /api/v1/comments/`
- `GET /api/v1/comments/`
- `GET /api/v1/admin/comments/pending/`
- `POST /api/v1/admin/comments/<commentid>/approve/`
- `DELETE /api/v1/comments/<commentid>/`

Admin login JSON body:

```json
{
	"username": "admin",
	"logname": "your_admin_logname"
}
```

Rule:

- Only admin needs login.
- Public users submit comments without login.
- New comments are saved as pending (`approved = false`).
- Public `GET /api/v1/comments/` returns only approved comments.

Create comment JSON body (public, no login):

```json
{
	"username": "alice",
	"comment": "Hello from my blog"
}
```

Success response (`201`):

```json
{
  "commentid": 1,
  "username": "alice",
  "comment": "Hello from my blog",
	"created_at": "2026-03-24T10:00:00Z",
	"approved": false,
	"message": "Comment submitted and pending admin review"
}
```

Get all comments response (`200`):

```json
{
	"comments": [
		{
			"commentid": 2,
			"username": "bob",
			"comment": "Nice post!",
			"created_at": "2026-03-24T10:02:00Z"
		},
		{
			"commentid": 1,
			"username": "alice",
			"comment": "Hello from my blog",
			"created_at": "2026-03-24T10:00:00Z"
		}
	]
}
```

Session test examples:

```bash
# 1) Public submit (pending review)
curl -i -X POST https://yclmir.pythonanywhere.com/api/v1/comments/ \
	-H "Content-Type: application/json" \
	-d '{"username":"alice","comment":"hello pending"}'

# 2) Admin login and save cookie
curl -i -c cookie.txt -X POST https://yclmir.pythonanywhere.com/api/v1/admin/login/ \
	-H "Content-Type: application/json" \
	-d '{"username":"admin","logname":"your_admin_logname"}'

# 3) Admin list pending comments
curl -i -b cookie.txt https://yclmir.pythonanywhere.com/api/v1/admin/comments/pending/

# 4) Admin approve one comment
curl -i -b cookie.txt -X POST https://yclmir.pythonanywhere.com/api/v1/admin/comments/1/approve/

# 5) Admin can delete a comment
curl -i -b cookie.txt -X DELETE https://yclmir.pythonanywhere.com/api/v1/comments/1/

# 6) Admin logout
curl -i -b cookie.txt -X POST https://yclmir.pythonanywhere.com/api/v1/admin/logout/
```

Current deployed endpoint:

`https://yclmir.pythonanywhere.com/api/v1/comments/`

PythonAnywhere deployment mode:

- API-only (no rendered HTML pages from Flask).

### Local JS client

This repository includes a local frontend client:

- `local_demo/index.html`
- `local_demo/comments.js`
- `local_demo/admin.html`
- `local_demo/admin.js`

It calls the JSON endpoint and renders the comment list in browser using JavaScript.
You can adapt it for admin moderation endpoints if needed.

Admin page usage:

- Open `http://127.0.0.1:8000/local_demo/admin.html`
- Admin login
- Review pending comments, approve or delete

For local testing, open the demo via HTTP server (not `file://`), e.g. `http://127.0.0.1:8000/local_demo/index.html`, so browser can send session cookies with `credentials: include`.

### Local run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --debug
```

### Deploy on PythonAnywhere

1. Upload this project folder to PythonAnywhere, for example:
	`/home/<your_pythonanywhere_username>/homepage_endpoints`
2. In **Consoles**, create/use a virtualenv and install dependencies:

	```bash
	cd ~/homepage_endpoints
	pip install -r requirements.txt
	```

3. In **Web** tab, create a new Flask web app.
4. Set your **Working directory** to the project folder.
5. In the generated WSGI configuration, you can use the same content as `wsgi.py`
	in this repo, or import `application` from it.
6. Reload the web app.

After deployment, POST comments to:

`https://<your_pythonanywhere_username>.pythonanywhere.com/api/v1/comments/`

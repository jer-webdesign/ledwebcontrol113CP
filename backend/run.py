from app import create_app
# import pprint

app = create_app()

if __name__ == "__main__":
    # debug: print registered routes so you can verify the exact endpoints
    # pprint.pprint(sorted(str(r) for r in app.url_map.iter_rules()))    
    app.run(host="0.0.0.0", port=5000, debug=True)

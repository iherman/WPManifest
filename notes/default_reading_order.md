Minor issues

- Not clearly defined what "algorithm termination" means. I suggest, for symmetry, that this means returning an empty reading order Array
- after step 2/3: if navigation document link is null, the algorithm terminates (see above)
- In step 10: if the document contains several 'nav' elements, only the first element is considered (in document order)
- In 10.3 the base for the relative path is the URL of the navigation document URL

- more generally: if the links in the json file are relative URL-s, they must be turned absolute with the manifest_url as base (or should it be the document_url?)

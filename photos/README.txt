PHOTOS FOLDER
=============

1. HEADER PHOTOS:
   - Hero photos are now stored in Supabase cloud storage
   - You can also add local photos to this folder
   - Example: photos/your-photo.jpg

2. GALLERY PHOTOS (transformations, achievements, powerlifting, coach, clients):
   Use the admin panel to manage all photos:
   - Open admin.html
   - Log in (default password: ramesh123, changeable in js/admin.js)
   - Choose a category: Transformations, Achievements, Powerlifting, Coach, or Clients
   - Add label and note
   - Upload photos
   - Photos are stored in Supabase cloud and appear instantly on all gallery pages

3. CATEGORIES:
   - Transformations: Body transformation photos
   - Achievements: Competition wins, milestones
   - Powerlifting: Strength training, lifts
   - Coach: Photos of Ramesh training
   - Clients: Client photos and testimonials

4. SUPABASE INTEGRATION:
   - Photos are automatically uploaded to Supabase Storage
   - Metadata is stored in Supabase Database
   - LocalStorage is used as backup
   - See SUPABASE_SETUP.md for configuration instructions

DROP POLICY IF EXISTS "Users can view same school users" ON users;
DROP POLICY IF EXISTS "School members can view users" ON users;
CREATE POLICY "Users can view same school users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can create school on signup" ON schools;
CREATE POLICY "Anyone can create school on signup" ON schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view schools" ON schools FOR SELECT USING (true);

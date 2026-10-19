// @vitest-environment node
import {afterEach,it,expect,vi} from "vitest";
import {createAnonClient} from "@/lib/supabase/anon";
afterEach(()=>vi.unstubAllEnvs());
it("fails closed when a build has no public Supabase configuration",()=>{
 vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","");vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","");
 expect(createAnonClient()).toBeNull();
});

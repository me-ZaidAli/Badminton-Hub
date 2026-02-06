import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useClubs } from "@/hooks/use-clubs";
import { apiRequest } from "@/lib/queryClient";
import { Upload, UserPlus, Trash2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";

interface StagedMember {
  fullName: string;
  email: string;
  gender: string;
  category: string;
}

interface ImportError {
  fullName?: string;
  email?: string;
  error: string;
}

interface ImportSuccess {
  fullName: string;
  email: string;
  profileId: number;
  existing: boolean;
}

interface ImportResult {
  success: ImportSuccess[];
  errors: ImportError[];
}

export default function MemberImport() {
  const { toast } = useToast();
  const { data: clubs, isLoading: clubsLoading } = useClubs();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [stagedMembers, setStagedMembers] = useState<StagedMember[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualGender, setManualGender] = useState("MALE");
  const [manualCategory, setManualCategory] = useState("D");

  const [isDragOver, setIsDragOver] = useState(false);

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/clubs/${selectedClubId}/import-members`, {
        members: stagedMembers,
      });
      return res.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      if (data.success?.length > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${data.success.length} member(s)`,
        });
      }
      if (data.errors?.length > 0) {
        toast({
          title: "Some imports failed",
          description: `${data.errors.length} member(s) could not be imported`,
          variant: "destructive",
        });
      }
      setStagedMembers([]);
    },
    onError: (err: Error) => {
      toast({
        title: "Import Failed",
        description: err.message || "Could not import members",
        variant: "destructive",
      });
    },
  });

  const parseCSV = (text: string) => {
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length < 2) {
      toast({
        title: "Invalid CSV",
        description: "CSV must have a header row and at least one data row",
        variant: "destructive",
      });
      return;
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const nameIdx = header.indexOf("fullname");
    const emailIdx = header.indexOf("email");
    const genderIdx = header.indexOf("gender");
    const categoryIdx = header.indexOf("category");

    if (nameIdx === -1 || emailIdx === -1) {
      toast({
        title: "Invalid CSV Format",
        description: "CSV must have 'fullName' and 'email' columns in the header",
        variant: "destructive",
      });
      return;
    }

    const parsed: StagedMember[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const fullName = cols[nameIdx] || "";
      const email = cols[emailIdx] || "";
      if (!fullName || !email) continue;

      const gender = genderIdx !== -1 && cols[genderIdx] ? cols[genderIdx].toUpperCase() : "MALE";
      const category = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx].toUpperCase() : "D";

      parsed.push({ fullName, email, gender, category });
    }

    if (parsed.length === 0) {
      toast({
        title: "No Valid Rows",
        description: "No valid member data found in the CSV",
        variant: "destructive",
      });
      return;
    }

    setStagedMembers((prev) => [...prev, ...parsed]);
    setImportResult(null);
    toast({
      title: "CSV Parsed",
      description: `Added ${parsed.length} member(s) to staging`,
    });
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid File",
        description: "Please upload a .csv file",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addManualEntry = () => {
    if (!manualName.trim() || !manualEmail.trim()) {
      toast({
        title: "Missing Fields",
        description: "Full name and email are required",
        variant: "destructive",
      });
      return;
    }
    setStagedMembers((prev) => [
      ...prev,
      {
        fullName: manualName.trim(),
        email: manualEmail.trim(),
        gender: manualGender,
        category: manualCategory,
      },
    ]);
    setManualName("");
    setManualEmail("");
    setManualGender("MALE");
    setManualCategory("D");
    setImportResult(null);
  };

  const removeStagedMember = (index: number) => {
    setStagedMembers((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Members"
        description="Import members to a club via CSV upload or manual entry"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Select Club
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label htmlFor="club-select">Club</Label>
            <Select
              value={selectedClubId}
              onValueChange={(val) => {
                setSelectedClubId(val);
                setImportResult(null);
              }}
            >
              <SelectTrigger data-testid="select-club" id="club-select">
                <SelectValue placeholder={clubsLoading ? "Loading clubs..." : "Select a club"} />
              </SelectTrigger>
              <SelectContent>
                {clubs?.map((club) => (
                  <SelectItem key={club.id} value={String(club.id)} data-testid={`select-club-option-${club.id}`}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedClubId && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  CSV Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="csv-drop-zone"
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Drag & drop a CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Format: fullName, email, gender, category
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInputChange}
                    data-testid="input-csv-file"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Manual Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-name">Full Name</Label>
                    <Input
                      id="manual-name"
                      placeholder="John Doe"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      data-testid="input-manual-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-email">Email</Label>
                    <Input
                      id="manual-email"
                      type="email"
                      placeholder="john@example.com"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      data-testid="input-manual-email"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={manualGender} onValueChange={setManualGender}>
                        <SelectTrigger data-testid="select-manual-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={manualCategory} onValueChange={setManualCategory}>
                        <SelectTrigger data-testid="select-manual-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={addManualEntry} className="w-full" data-testid="button-add-member">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle>Staging Area</CardTitle>
                <Badge variant="secondary">{stagedMembers.length} member(s)</Badge>
              </div>
              {stagedMembers.length > 0 && (
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending}
                  data-testid="button-import-members"
                >
                  {importMutation.isPending ? (
                    "Importing..."
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {stagedMembers.length} Member(s)
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {stagedMembers.length === 0 ? (
                <div className="py-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No members staged yet. Upload a CSV or add members manually.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stagedMembers.map((member, index) => (
                        <TableRow key={index} data-testid={`row-staged-member-${index}`}>
                          <TableCell data-testid={`text-member-name-${index}`}>{member.fullName}</TableCell>
                          <TableCell data-testid={`text-member-email-${index}`}>{member.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{member.gender}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{member.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeStagedMember(index)}
                              data-testid={`button-remove-member-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {importResult && (
            <Card data-testid="import-results">
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {importResult.success?.length > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20" data-testid="import-success-summary">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm font-medium">
                      Successfully imported {importResult.success.length} member(s)
                    </p>
                  </div>
                )}
                {importResult.errors?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20" data-testid="import-error-summary">
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                      <p className="text-sm font-medium">
                        {importResult.errors.length} member(s) failed to import
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((err, index) => (
                            <TableRow key={index} data-testid={`row-import-error-${index}`}>
                              <TableCell>{err.fullName || "-"}</TableCell>
                              <TableCell>{err.email || "-"}</TableCell>
                              <TableCell className="text-destructive">{err.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
